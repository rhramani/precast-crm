const siteService = require('./service');

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a site');
    err.statusCode = 400;
    throw err;
  }

  const site = await siteService.createSite(branchId, req.body);
  res.status(201).json({ success: true, message: 'Project site created successfully', data: { site } });
};

const update = async (req, res) => {
  const site = await siteService.updateSite(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Site details updated', data: { site } });
};

const updateStatus = async (req, res) => {
  const site = await siteService.updateSiteStatus(req.params.id, req.branchFilter, req.body.status);
  res.json({ success: true, message: `Site is now ${req.body.status}`, data: { site } });
};

const calculate = async (req, res) => {
  const { siteArea } = req.body;
  const result = await siteService.calculateRequirements(req.params.id, req.branchFilter, siteArea);
  res.json({
    success: true,
    message: 'Site requirement calculations completed',
    data: result,
  });
};

const getOne = async (req, res) => {
  const site = await siteService.getSite(req.params.id, req.branchFilter);
  if (!site) {
    const err = new Error('Site not found');
    err.statusCode = 404;
    throw err;
  }
  res.json({ success: true, data: { site } });
};

const remove = async (req, res) => {
  await siteService.deleteSite(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Project site deleted successfully' });
};

const getDispatchRequirements = async (req, res) => {
  const result = await siteService.getSiteProductRequirements(req.params.id, req.branchFilter);
  res.json({ success: true, data: result });
};

module.exports = {
  create,
  update,
  updateStatus,
  calculate,
  getDispatchRequirements,
  getOne,
  remove,
};


