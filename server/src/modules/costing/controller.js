const costingService = require('./service');

const getSiteCosting = async (req, res) => {
  const result = await costingService.calculateSiteCosting(req.params.siteId, req.branchFilter);
  res.json({
    success: true,
    message: 'Site actual costing calculations completed',
    data: result,
  });
};

const getProjectCosting = async (req, res) => {
  const result = await costingService.calculateProjectCosting(req.params.projectId, req.branchFilter);
  res.json({
    success: true,
    message: 'Project actual costing calculations completed',
    data: result,
  });
};

module.exports = {
  getSiteCosting,
  getProjectCosting,
};
