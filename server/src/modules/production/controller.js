const productionService = require('./service');
const { calculateCapacity } = require('./calculator');
const { logActivity } = require('../../middlewares/auditLogger');

const list = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await productionService.listOrders(req.branchFilter, { page, limit, search, status });
  res.json({ success: true, data: { orders: result.orders }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a production order');
    err.statusCode = 400;
    throw err;
  }

  const order = await productionService.createOrder(branchId, req.user.userId, req.body);
  await logActivity(req.user.userId, 'create', 'production', order._id, req.ip);
  res.status(201).json({ success: true, message: 'Production order created', data: { order } });
};

const getOne = async (req, res) => {
  const order = await productionService.getOrder(req.params.id, req.branchFilter);
  res.json({ success: true, data: { order } });
};

const updateStatus = async (req, res) => {
  const order = await productionService.updateStatus(req.params.id, req.branchFilter, req.body.status);
  await logActivity(req.user.userId, 'update_status', 'production', order._id, req.ip);
  res.json({ success: true, message: `Status updated to ${req.body.status}`, data: { order } });
};

const complete = async (req, res) => {
  const { order, fgInventory } = await productionService.completeOrder(
    req.params.id,
    req.branchFilter,
    req.body,
    req.user.userId
  );
  await logActivity(req.user.userId, 'complete', 'production', order._id, req.ip);
  res.json({
    success: true,
    message: 'Production order completed successfully. Inventory updated.',
    data: { order, finishedGoods: fgInventory },
  });
};

const capacityCalculator = async (req, res) => {
  const { productId, targetQuantity } = req.body;

  if (!productId) {
    const err = new Error('Product ID is required');
    err.statusCode = 400;
    throw err;
  }

  const result = await calculateCapacity(productId, req.branchFilter, Number(targetQuantity || 0));
  res.json({
    success: true,
    message: 'Capacity calculation completed',
    data: result,
  });
};

module.exports = {
  list,
  create,
  getOne,
  updateStatus,
  complete,
  capacityCalculator,
};
