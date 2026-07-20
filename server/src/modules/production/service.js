const mongoose = require('mongoose');
const ProductionOrder = require('./model');
const Product = require('../products/model');
const BOM = require('../bom/model');
const RawMaterial = require('../rawMaterials/model');
const MaterialLedger = require('../rawMaterials/ledgerModel');
const FinishedGoodsInventory = require('../inventory/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Orders
const listOrders = async (branchFilter, { page = 1, limit = 10, search, status }) => {
  const filter = { ...branchFilter };

  if (search) {
    filter.orderNumber = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    ProductionOrder.find(filter)
      .populate('productId', 'productName productCode unit')
      .populate('bomId', 'version calculatedCost')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ProductionOrder.countDocuments(filter),
  ]);

  return { orders, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Order
const createOrder = async (branchId, userId, data) => {
  // Find product
  const product = await Product.findOne({ _id: data.productId, branchId });
  if (!product) {
    const err = new Error('Product not found in this branch');
    err.statusCode = 404;
    throw err;
  }

  // Find BOM
  let bom;
  if (data.bomId) {
    bom = await BOM.findOne({ _id: data.bomId, productId: data.productId });
  } else {
    bom = await BOM.findOne({ productId: data.productId, isActive: true });
  }

  if (!bom) {
    const err = new Error('No active Bill of Materials (BOM) found for this product. Please define a BOM first.');
    err.statusCode = 404;
    throw err;
  }

  // Auto-generate orderNumber if empty
  const orderNumber = data.orderNumber || `PRD-${Date.now().toString().slice(-8)}`;

  // Double check uniqueness
  const conflict = await ProductionOrder.findOne({ branchId, orderNumber });
  if (conflict) {
    const err = new Error(`Production order number '${orderNumber}' is already in use`);
    err.statusCode = 409;
    throw err;
  }

  // Pre-calculate materials consumed based on plannedQuantity
  const materialsConsumed = bom.items.map((item) => {
    const requiredQty = item.quantityRequired * (1 + (item.wastagePercent || 0) / 100);
    return {
      materialId: item.materialId,
      quantity: requiredQty * data.plannedQuantity,
    };
  });

  const order = await ProductionOrder.create({
    branchId,
    orderNumber,
    productId: data.productId,
    plannedQuantity: data.plannedQuantity,
    bomId: bom._id,
    materialsConsumed,
    status: 'draft',
    startDate: data.startDate || null,
    createdBy: userId,
  });

  return order;
};

// 3. Get Details
const getOrder = async (id, branchFilter) => {
  const order = await ProductionOrder.findOne({ _id: id, ...branchFilter })
    .populate('productId', 'productName productCode unit')
    .populate('bomId', 'version calculatedCost')
    .populate('materialsConsumed.materialId', 'materialName materialCode unit currentQuantity');

  if (!order) {
    const err = new Error('Production order not found');
    err.statusCode = 404;
    throw err;
  }

  return order;
};

// 4. Update Status (transitions: pending, in_production, cancelled)
const updateStatus = async (id, branchFilter, status) => {
  const order = await ProductionOrder.findOne({ _id: id, ...branchFilter });
  if (!order) {
    const err = new Error('Production order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.status === 'completed') {
    const err = new Error('Completed production orders cannot be changed');
    err.statusCode = 400;
    throw err;
  }

  if (status === 'completed') {
    const err = new Error('Please use the complete production API to close this order');
    err.statusCode = 400;
    throw err;
  }

  order.status = status;
  if (status === 'in_production' && !order.startDate) {
    order.startDate = new Date();
  }

  await order.save();
  return order;
};

// 5. Complete Production Order (CRITICAL TRANSACTION)
const completeOrder = async (id, branchFilter, { producedQuantity, damagedQuantity = 0, remarks }, userId) => {
  // Let's use Mongoose Session to execute a transaction if a replica set is active.
  // Fall back to a sequenced sequence if replica set is not available.
  const db = mongoose.connection;
  let session = null;

  try {
    // Attempt session setup
    session = await db.startSession();
  } catch (e) {
    // Replica set not configured, fall back to sequenced sequence
    session = null;
  }

  const executeComplete = async (sess) => {
    const queryOpts = sess ? { session: sess } : {};

    // Validate damaged quantity
    const damQty = Number(damagedQuantity) || 0;
    if (isNaN(damQty) || damQty < 0) {
      const err = new Error('Damaged quantity must be a non-negative number');
      err.statusCode = 400;
      throw err;
    }
    if (damQty > producedQuantity) {
      const err = new Error('Damaged quantity cannot exceed actual produced quantity');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch order
    const order = await ProductionOrder.findOne({ _id: id, ...branchFilter }, null, queryOpts);
    if (!order) {
      const err = new Error('Production order not found');
      err.statusCode = 404;
      throw err;
    }

    if (order.status === 'completed') {
      const err = new Error('Production order is already completed');
      err.statusCode = 400;
      throw err;
    }

    if (order.status === 'cancelled') {
      const err = new Error('Cancelled production orders cannot be completed');
      err.statusCode = 400;
      throw err;
    }

    // Recalculate material consumption based on actual produced quantity
    const actualConsumed = [];
    const bom = await BOM.findById(order.bomId, null, queryOpts);
    if (!bom) {
      const err = new Error('Active BOM definition associated with this order has been deleted');
      err.statusCode = 400;
      throw err;
    }

    // Validate raw material availability before performing any writes!
    for (const item of bom.items) {
      const neededQty = item.quantityRequired * (1 + (item.wastagePercent || 0) / 100) * producedQuantity;
      const material = await RawMaterial.findById(item.materialId, null, queryOpts);

      if (!material) {
        const err = new Error(`Raw material associated with this BOM was not found`);
        err.statusCode = 404;
        throw err;
      }

      if (material.currentQuantity < neededQty) {
        const err = new Error(`Insufficient stock for material '${material.materialName}'. Available: ${material.currentQuantity} ${material.unit}, Needed: ${neededQty.toFixed(2)} ${material.unit}`);
        err.statusCode = 400;
        throw err;
      }

      actualConsumed.push({
        materialId: material._id,
        neededQty,
        materialRecord: material,
      });
    }

    // 2. Deduct materials & write logs
    for (const record of actualConsumed) {
      const mat = record.materialRecord;
      mat.currentQuantity -= record.neededQty;
      const balanceAfter = mat.currentQuantity;
      await mat.save(queryOpts);

      // Ledger entry
      await MaterialLedger.create(
        [
          {
            branchId: order.branchId,
            materialId: mat._id,
            type: 'out',
            quantity: record.neededQty,
            referenceType: 'production',
            referenceId: order._id,
            balanceAfter,
            remarks: remarks || `Consumed for completing Order #${order.orderNumber}`,
            createdBy: userId,
          },
        ],
        queryOpts
      );

      // Out of stock notification trigger
      if (mat.currentQuantity <= 0) {
        const { triggerNotification } = require('../notifications/service');
        await triggerNotification({
          branchId: order.branchId,
          title: 'Out of Stock Warning',
          message: `Raw Material '${mat.materialName}' is out of stock (current balance is ${balanceAfter.toFixed(2)} ${mat.unit})`,
          type: 'low_stock',
        });
      }
    }

    // 3. Find or create Finished Goods Inventory entry
    let fgInventory = await FinishedGoodsInventory.findOne({
      branchId: order.branchId,
      productId: order.productId,
    }, null, queryOpts);

    if (!fgInventory) {
      fgInventory = new FinishedGoodsInventory({
        branchId: order.branchId,
        productId: order.productId,
        availableStock: 0,
        reservedStock: 0,
        damagedStock: 0,
        dispatchReadyStock: 0,
      });
    }

    fgInventory.availableStock += (producedQuantity - damQty);
    fgInventory.dispatchReadyStock += (producedQuantity - damQty); // Matches dispatch decrement rules in later phases
    fgInventory.damagedStock += damQty;
    await fgInventory.save(queryOpts);

    // 4. Update order details
    order.status = 'completed';
    order.producedQuantity = producedQuantity;
    order.damagedQuantity = damQty;
    order.materialsConsumed = actualConsumed.map((r) => ({
      materialId: r.materialId,
      quantity: r.neededQty,
    }));
    order.completedDate = new Date();
    await order.save(queryOpts);

    return { order, fgInventory };
  };

  if (session) {
    try {
      session.startTransaction();
      const result = await executeComplete(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    // Normal sequential execution fallback
    return await executeComplete(null);
  }
};

// 6. Update Order (fields like plannedQuantity, startDate, orderNumber, productId, branchId)
const updateOrder = async (id, branchFilter, data, userId) => {
  const order = await ProductionOrder.findOne({ _id: id, ...branchFilter });
  if (!order) {
    const err = new Error('Production order not found');
    err.statusCode = 404;
    throw err;
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    const err = new Error('Completed or cancelled production orders cannot be updated');
    err.statusCode = 400;
    throw err;
  }

  // Handle product change
  if (data.productId && data.productId !== order.productId.toString()) {
    // Only allow product change in draft status
    if (order.status !== 'draft') {
      const err = new Error('Product cannot be changed after submitting for production');
      err.statusCode = 400;
      throw err;
    }

    const product = await Product.findOne({ _id: data.productId, branchId: order.branchId });
    if (!product) {
      const err = new Error('Product not found in this branch');
      err.statusCode = 404;
      throw err;
    }

    // Get active BOM for the new product
    let bom;
    if (data.bomId) {
      bom = await BOM.findOne({ _id: data.bomId, productId: data.productId });
    } else {
      bom = await BOM.findOne({ productId: data.productId, isActive: true });
    }

    if (!bom) {
      const err = new Error('No active Bill of Materials (BOM) found for this product. Please define a BOM first.');
      err.statusCode = 404;
      throw err;
    }

    order.productId = data.productId;
    order.bomId = bom._id;
  }

  // If plannedQuantity changes or productId changes, we must recalculate materialsConsumed
  const quantityChanged = data.plannedQuantity !== undefined && Number(data.plannedQuantity) !== order.plannedQuantity;
  const productChanged = data.productId !== undefined && data.productId !== order.productId.toString();

  if (quantityChanged || productChanged) {
    const qty = data.plannedQuantity !== undefined ? Number(data.plannedQuantity) : order.plannedQuantity;
    if (isNaN(qty) || qty <= 0) {
      const err = new Error('Planned quantity must be greater than zero');
      err.statusCode = 400;
      throw err;
    }

    // Fetch BOM to recalculate materialsConsumed
    const bom = await BOM.findById(order.bomId);
    if (!bom) {
      const err = new Error('Associated BOM not found');
      err.statusCode = 404;
      throw err;
    }

    order.plannedQuantity = qty;
    order.materialsConsumed = bom.items.map((item) => {
      const requiredQty = item.quantityRequired * (1 + (item.wastagePercent || 0) / 100);
      return {
        materialId: item.materialId,
        quantity: requiredQty * qty,
      };
    });
  }

  if (data.startDate !== undefined) {
    order.startDate = data.startDate || null;
  }

  if (data.orderNumber) {
    // Check uniqueness
    const conflict = await ProductionOrder.findOne({
      branchId: order.branchId,
      orderNumber: data.orderNumber,
      _id: { $ne: id },
    });
    if (conflict) {
      const err = new Error(`Production order number '${data.orderNumber}' is already in use`);
      err.statusCode = 409;
      throw err;
    }
    order.orderNumber = data.orderNumber;
  }

  // If super admin and branch changes (only allow in draft)
  if (data.branchId && data.branchId !== order.branchId.toString()) {
    if (order.status !== 'draft') {
      const err = new Error('Branch cannot be changed after submitting for production');
      err.statusCode = 400;
      throw err;
    }
    order.branchId = data.branchId;
  }

  await order.save();
  return order;
};

module.exports = {
  listOrders,
  createOrder,
  getOrder,
  updateStatus,
  completeOrder,
  updateOrder,
};

