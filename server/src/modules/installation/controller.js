const installationService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status } = req.query;
  const result = await installationService.listInstallations(req.branchFilter, { page, limit, search, status });
  res.json({ success: true, data: { installations: result.installations }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to log an installation');
    err.statusCode = 400;
    throw err;
  }

  const installation = await installationService.createInstallation(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Installation log registered', data: { installation } });
};

const getOne = async (req, res) => {
  const installation = await installationService.getInstallation(req.params.id, req.branchFilter);
  res.json({ success: true, data: { installation } });
};

const update = async (req, res) => {
  const installation = await installationService.updateInstallation(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Installation log updated successfully', data: { installation } });
};

const patchStatus = async (req, res) => {
  const installation = await installationService.updateStatus(req.params.id, req.branchFilter, req.body.status);
  res.json({ success: true, message: `Installation status is now ${req.body.status}`, data: { installation } });
};

module.exports = {
  list,
  create,
  getOne,
  update,
  patchStatus,
};
