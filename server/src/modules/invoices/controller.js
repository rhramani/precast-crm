const invoiceService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status, customerId } = req.query;
  const result = await invoiceService.listInvoices(req.branchFilter, { page, limit, search, status, customerId });
  res.json({ success: true, data: { invoices: result.invoices }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to generate an invoice');
    err.statusCode = 400;
    throw err;
  }

  const invoice = await invoiceService.createInvoice(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Invoice generated successfully', data: { invoice } });
};

const getOne = async (req, res) => {
  const invoice = await invoiceService.getInvoice(req.params.id, req.branchFilter);
  res.json({ success: true, data: { invoice } });
};

const update = async (req, res) => {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Invoice details updated', data: { invoice } });
};

const cancel = async (req, res) => {
  const invoice = await invoiceService.cancelInvoice(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Invoice has been cancelled successfully', data: { invoice } });
};

module.exports = {
  list,
  create,
  getOne,
  update,
  cancel,
};
