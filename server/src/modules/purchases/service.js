const mongoose = require('mongoose');
const Supplier = require('./supplierModel');
const PurchaseOrder = require('./model');
const RawMaterial = require('../rawMaterials/model');
const MaterialLedger = require('../rawMaterials/ledgerModel');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// Calculate PO subTotal, taxAmount (18%), and grandTotal
const calculateTotals = (items) => {
  let subTotal = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const totalAmount = item.quantity * item.purchaseRate;
    subTotal += totalAmount;
    taxAmount += totalAmount * 0.18; // standard 18% tax

    return {
      ...item,
      totalAmount,
    };
  });

  const grandTotal = subTotal + taxAmount;
  return { items: calculatedItems, subTotal, taxAmount, grandTotal };
};

// ────────────────────────────────────────────────────────────
// Suppliers CRUD
// ────────────────────────────────────────────────────────────
const listSuppliers = async ({ page = 1, limit = 10, search, status }) => {
  const filter = {};
  if (search) {
    filter.$or = [
      { supplierName:  { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { email:         { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Supplier.countDocuments(filter),
  ]);

  return { suppliers, meta: buildMeta(Number(page), Number(limit), total) };
};

const createSupplier = async (data) => {
  return await Supplier.create(data);
};

const updateSupplier = async (id, data) => {
  const supplier = await Supplier.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!supplier) {
    const err = new Error('Supplier not found');
    err.statusCode = 404;
    throw err;
  }
  return supplier;
};

// ────────────────────────────────────────────────────────────
// Purchase Orders CRUD
// ────────────────────────────────────────────────────────────
const listOrders = async (branchFilter, { page = 1, limit = 10, search, status }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.poNumber = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    PurchaseOrder.find(filter)
      .populate('supplierId', 'supplierName contactPerson mobileNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    PurchaseOrder.countDocuments(filter),
  ]);

  return { orders, meta: buildMeta(Number(page), Number(limit), total) };
};

const createOrder = async (branchId, userId, data) => {
  // Check supplier exists
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) {
    const err = new Error('Supplier not found');
    err.statusCode = 404;
    throw err;
  }

  // Auto-generate PO number sequentially
  const lastPO = await PurchaseOrder.findOne({ branchId }).sort({ poNumber: -1 });
  let suffix = 1;
  if (lastPO && lastPO.poNumber) {
    const match = lastPO.poNumber.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const poNumber = `PO-${String(suffix).padStart(5, '0')}`;

  const { items, subTotal, taxAmount, grandTotal } = calculateTotals(data.items);

  const order = await PurchaseOrder.create({
    branchId,
    supplierId: data.supplierId,
    poNumber,
    items,
    subTotal,
    taxAmount,
    grandTotal,
    status: 'draft',
    expectedDeliveryDate: data.expectedDeliveryDate || null,
    createdBy: userId,
  });

  return order;
};

const getOrder = async (id, branchFilter) => {
  const order = await PurchaseOrder.findOne({ _id: id, ...branchFilter })
    .populate('supplierId')
    .populate('items.materialId', 'materialName materialCode unit currentQuantity');

  if (!order) {
    const err = new Error('Purchase order not found');
    err.statusCode = 404;
    throw err;
  }

  return order;
};

const updateOrder = async (id, branchFilter, data) => {
  const order = await PurchaseOrder.findOne({ _id: id, ...branchFilter });
  if (!order) {
    const err = new Error('Purchase order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.status === 'received') {
    const err = new Error('Completed/Received purchase orders cannot be modified');
    err.statusCode = 400;
    throw err;
  }

  if (data.items) {
    const { items, subTotal, taxAmount, grandTotal } = calculateTotals(data.items);
    order.items = items;
    order.subTotal = subTotal;
    order.taxAmount = taxAmount;
    order.grandTotal = grandTotal;
  }

  if (data.expectedDeliveryDate) {
    order.expectedDeliveryDate = data.expectedDeliveryDate;
  }

  if (data.status) {
    order.status = data.status;
  }

  await order.save();
  return order;
};

// ────────────────────────────────────────────────────────────
// Receive Order (CRITICAL INVENTORY TRANSACTION)
// ────────────────────────────────────────────────────────────
const receiveOrder = async (id, branchFilter, { remarks }, userId) => {
  const db = mongoose.connection;
  let session = null;

  try {
    session = await db.startSession();
  } catch (e) {
    session = null;
  }

  const executeReceive = async (sess) => {
    const queryOpts = sess ? { session: sess } : {};

    const order = await PurchaseOrder.findOne({ _id: id, ...branchFilter }, null, queryOpts);
    if (!order) {
      const err = new Error('Purchase order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.status === 'received') {
      const err = new Error('This purchase order has already been received');
      err.statusCode = 400;
      throw err;
    }

    if (order.status === 'cancelled') {
      const err = new Error('Cancelled purchase orders cannot be received');
      err.statusCode = 400;
      throw err;
    }

    // Increment raw material stocks & log movements
    for (const item of order.items) {
      const material = await RawMaterial.findById(item.materialId, null, queryOpts);
      if (!material) {
        const err = new Error(`Raw material associated with PO item not found`);
        err.statusCode = 404;
        throw err;
      }

      material.currentQuantity += item.quantity;
      const balanceAfter = material.currentQuantity;
      await material.save(queryOpts);

      // Ledger entry log
      await MaterialLedger.create(
        [
          {
            branchId: order.branchId,
            materialId: material._id,
            type: 'in',
            quantity: item.quantity,
            referenceType: 'purchase',
            referenceId: order._id,
            balanceAfter,
            remarks: remarks || `Received items from PO #${order.poNumber}`,
            createdBy: userId,
          },
        ],
        queryOpts
      );
    }

    order.status = 'received';
    order.receivedDate = new Date();
    await order.save(queryOpts);

    return order;
  };

  if (session) {
    try {
      session.startTransaction();
      const result = await executeReceive(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    return await executeReceive(null);
  }
};

const deleteSupplier = async (id) => {
  // Check if supplier is referenced in any purchase orders
  const references = await PurchaseOrder.findOne({ supplierId: id });
  if (references) {
    const err = new Error('Supplier cannot be deleted because they are referenced in purchase orders');
    err.statusCode = 400;
    throw err;
  }

  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) {
    const err = new Error('Supplier not found');
    err.statusCode = 404;
    throw err;
  }
  return supplier;
};

module.exports = {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listOrders,
  createOrder,
  getOrder,
  updateOrder,
  receiveOrder,
};

