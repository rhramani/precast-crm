const service = require('./service');

// GET /branches
const list = async (req, res) => {
  const { page, limit, search, sortBy, sortOrder } = req.query;
  const result = await service.listBranches({
    page:      page ? parseInt(page) : undefined,
    limit:     limit ? parseInt(limit) : undefined,
    search,
    sortBy,
    sortOrder,
  });
  res.json({ success: true, data: { branches: result.branches }, meta: result.meta });
};

// GET /branches/:id
const getOne = async (req, res) => {
  const branch = await service.getBranchById(req.params.id);
  res.json({ success: true, data: { branch } });
};

// POST /branches
const create = async (req, res) => {
  const branch = await service.createBranch(req.body);
  res.status(201).json({ success: true, message: 'Branch created successfully', data: { branch } });
};

// PUT /branches/:id
const update = async (req, res) => {
  const branch = await service.updateBranch(req.params.id, req.body);
  res.json({ success: true, message: 'Branch updated successfully', data: { branch } });
};

// PATCH /branches/:id/status
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const branch = await service.updateBranchStatus(req.params.id, status);
  res.json({ success: true, message: 'Branch status updated successfully', data: { branch } });
};

// PATCH /branches/:id/subscription
const updateSubscription = async (req, res) => {
  const branch = await service.updateSubscription(req.params.id, req.body);
  res.json({ success: true, message: 'Subscription updated successfully', data: { branch } });
};

// DELETE /branches/:id
const remove = async (req, res) => {
  await service.deleteBranch(req.params.id);
  res.json({ success: true, message: 'Branch deleted successfully' });
};

module.exports = {
  list,
  getOne,
  create,
  update,
  updateStatus,
  updateSubscription,
  remove,
};
