const costingService = require('./service');

const getSiteCosting = async (req, res) => {
  const result = await costingService.calculateSiteCosting(req.params.siteId, req.branchFilter);
  res.json({
    success: true,
    message: 'Site actual costing calculations completed',
    data: result,
  });
};

module.exports = {
  getSiteCosting,
};
