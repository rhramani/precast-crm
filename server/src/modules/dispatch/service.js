const mongoose = require('mongoose');
const Dispatch = require('./model');
const FinishedGoodsInventory = require('../inventory/model');
const Site = require('../sites/model');
const Product = require('../products/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Dispatches
const listDispatches = async (branchFilter, { page = 1, limit = 10, search, status, startDate, endDate }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.dispatchNumber = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }
  if (startDate) {
    filter.createdAt = endDate ? { $gte: new Date(startDate), $lte: new Date(endDate) } : { $gte: new Date(startDate) };
  }

  const skip = (page - 1) * limit;

  const [dispatches, total] = await Promise.all([
    Dispatch.find(filter)
      .populate('projectId', 'projectName')
      .populate('siteId', 'siteName siteAddress')
      .populate('items.productId', 'productName productCode unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Dispatch.countDocuments(filter),
  ]);

  return { dispatches, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Dispatch
const createDispatch = async (branchId, userId, data) => {
  // Auto-generate Dispatch number sequentially
  const lastDisp = await Dispatch.findOne({ branchId }).sort({ dispatchNumber: -1 });
  let suffix = 1;
  if (lastDisp && lastDisp.dispatchNumber) {
    const match = lastDisp.dispatchNumber.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const dispatchNumber = `DSP-${String(suffix).padStart(5, '0')}`;

  const dispatch = await Dispatch.create({
    branchId,
    projectId: data.projectId,
    siteId: data.siteId,
    dispatchNumber,
    items: data.items,
    transportDetails: data.transportDetails || {},
    status: 'draft',
    createdBy: userId,
  });

  return dispatch;
};

const getDispatch = async (id, branchFilter) => {
  const dispatch = await Dispatch.findOne({ _id: id, ...branchFilter })
    .populate('projectId')
    .populate('siteId')
    .populate('items.productId', 'productName productCode unit');

  if (!dispatch) {
    const err = new Error('Dispatch not found');
    err.statusCode = 404;
    throw err;
  }

  return dispatch;
};

// 3. Update Details
const updateDispatch = async (id, branchFilter, data) => {
  const dispatch = await Dispatch.findOne({ _id: id, ...branchFilter });
  if (!dispatch) {
    const err = new Error('Dispatch not found');
    err.statusCode = 404;
    throw err;
  }

  if (dispatch.status !== 'draft') {
    const err = new Error('Only draft dispatches can be edited');
    err.statusCode = 400;
    throw err;
  }

  if (data.items)             dispatch.items = data.items;
  if (data.transportDetails)  dispatch.transportDetails = data.transportDetails;

  await dispatch.save();
  return dispatch;
};

// 4. Confirm Dispatch (CRITICAL INVENTORY TRANSACTION)
const confirmDispatch = async (id, branchFilter, userId) => {
  const db = mongoose.connection;
  let session = null;

  try {
    session = await db.startSession();
  } catch (e) {
    session = null;
  }

  const executeDispatch = async (sess) => {
    const queryOpts = sess ? { session: sess } : {};

    const dispatch = await Dispatch.findOne({ _id: id, ...branchFilter }, null, queryOpts);
    if (!dispatch) {
      const err = new Error('Dispatch record not found');
      err.statusCode = 404;
      throw err;
    }

    if (dispatch.status !== 'draft') {
      const err = new Error('Only draft dispatches can be marked as dispatched');
      err.statusCode = 400;
      throw err;
    }

    // Validate finished goods availability before writes!
    const validatedInventory = [];
    for (const item of dispatch.items) {
      const fgInv = await FinishedGoodsInventory.findOne({
        branchId: dispatch.branchId,
        productId: item.productId,
      }, null, queryOpts);

      if (!fgInv || fgInv.availableStock < item.quantity) {
        const err = new Error(`Insufficient stock in Finished Goods. Needed: ${item.quantity}, Available: ${fgInv ? fgInv.availableStock : 0}`);
        err.statusCode = 400;
        throw err;
      }

      validatedInventory.push({
        inventoryRecord: fgInv,
        deductQty: item.quantity,
      });
    }

    // Deduct stock
    for (const record of validatedInventory) {
      const inv = record.inventoryRecord;
      inv.availableStock -= record.deductQty;
      inv.dispatchReadyStock -= record.deductQty;
      await inv.save(queryOpts);
    }

    dispatch.status = 'dispatched';
    dispatch.dispatchedDate = new Date();
    await dispatch.save(queryOpts);

    // Automatically transition site status to in_progress if currently planned
    const site = await Site.findById(dispatch.siteId, null, queryOpts);
    if (site && site.status === 'planned') {
      site.status = 'in_progress';
      if (!site.startDate) site.startDate = new Date();
      await site.save(queryOpts);
    }

    return dispatch;
  };

  if (session) {
    try {
      session.startTransaction();
      const result = await executeDispatch(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    return await executeDispatch(null);
  }
};

// 5. Confirm Delivery
const confirmDelivery = async (id, branchFilter) => {
  const dispatch = await Dispatch.findOne({ _id: id, ...branchFilter });
  if (!dispatch) {
    const err = new Error('Dispatch not found');
    err.statusCode = 404;
    throw err;
  }

  if (dispatch.status !== 'dispatched') {
    const err = new Error('Only dispatched items can be marked as delivered');
    err.statusCode = 400;
    throw err;
  }

  dispatch.status = 'delivered';
  dispatch.deliveredDate = new Date();
  await dispatch.save();

  return dispatch;
};

module.exports = {
  listDispatches,
  createDispatch,
  getDispatch,
  updateDispatch,
  confirmDispatch,
  confirmDelivery,
};
