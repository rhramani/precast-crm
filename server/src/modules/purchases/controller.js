const purchaseService = require('./service');

// Suppliers
const listSuppliers = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await purchaseService.listSuppliers({ page, limit, search, status });
  res.json({ success: true, data: { suppliers: result.suppliers }, meta: result.meta });
};

const createSupplier = async (req, res) => {
  const supplier = await purchaseService.createSupplier(req.body);
  res.status(201).json({ success: true, message: 'Supplier created successfully', data: { supplier } });
};

const updateSupplier = async (req, res) => {
  const supplier = await purchaseService.updateSupplier(req.params.id, req.body);
  res.json({ success: true, message: 'Supplier updated successfully', data: { supplier } });
};

// Purchase Orders
const listOrders = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await purchaseService.listOrders(req.branchFilter, { page, limit, search, status });
  res.json({ success: true, data: { orders: result.orders }, meta: result.meta });
};

const createOrder = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a purchase order');
    err.statusCode = 400;
    throw err;
  }

  const order = await purchaseService.createOrder(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Purchase order created', data: { order } });
};

const getOneOrder = async (req, res) => {
  const order = await purchaseService.getOrder(req.params.id, req.branchFilter);
  res.json({ success: true, data: { order } });
};

const updateOrder = async (req, res) => {
  const order = await purchaseService.updateOrder(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Purchase order updated', data: { order } });
};

const receiveOrder = async (req, res) => {
  const order = await purchaseService.receiveOrder(req.params.id, req.branchFilter, req.body, req.user.userId);
  res.json({ success: true, message: 'Purchase order goods received. Inventory updated.', data: { order } });
};

const deleteSupplier = async (req, res) => {
  await purchaseService.deleteSupplier(req.params.id);
  res.json({ success: true, message: 'Supplier deleted successfully' });
};

module.exports = {
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listOrders,
  createOrder,
  getOneOrder,
  updateOrder,
  receiveOrder,
};

