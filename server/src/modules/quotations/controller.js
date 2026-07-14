const quotationService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await quotationService.listQuotations(req.branchFilter, { page, limit, search, status });
  res.json({ success: true, data: { quotations: result.quotations }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a quotation');
    err.statusCode = 400;
    throw err;
  }

  const quote = await quotationService.createQuotation(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Quotation created successfully', data: { quotation: quote } });
};

const update = async (req, res) => {
  const quote = await quotationService.updateQuotation(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Quotation updated successfully', data: { quotation: quote } });
};

const updateStatus = async (req, res) => {
  const quote = await quotationService.updateStatus(req.params.id, req.branchFilter, req.body.status, req.user.userId);
  res.json({ success: true, message: `Quotation status is now ${req.body.status}`, data: { quotation: quote } });
};

const getOne = async (req, res) => {
  const quote = await quotationService.getQuotation(req.params.id, req.branchFilter);
  res.json({ success: true, data: { quotation: quote } });
};

const remove = async (req, res) => {
  await quotationService.deleteQuotation(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Quotation deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  updateStatus,
  getOne,
  remove,
};
