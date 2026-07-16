const paymentService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, customerId } = req.query;
  const result = await paymentService.listPayments(req.branchFilter, { page, limit, search, customerId });
  res.json({ success: true, data: { payments: result.payments }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to register a payment receipt');
    err.statusCode = 400;
    throw err;
  }

  const payment = await paymentService.createPayment(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Payment registered and allocated successfully', data: { payment } });
};

const getOne = async (req, res) => {
  const payment = await paymentService.getPayment(req.params.id, req.branchFilter);
  res.json({ success: true, data: { payment } });
};

module.exports = {
  list,
  create,
  getOne,
};
