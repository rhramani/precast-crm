const reportService = require('./service');

const production = async (req, res) => {
  const data = await reportService.getProductionReport(req.branchFilter);
  res.json({ success: true, data });
};

const inventory = async (req, res) => {
  const data = await reportService.getInventoryReport(req.branchFilter);
  res.json({ success: true, data });
};

const customer = async (req, res) => {
  const data = await reportService.getCustomerReport(req.branchFilter);
  res.json({ success: true, data });
};

const project = async (req, res) => {
  const data = await reportService.getProjectReport(req.branchFilter);
  res.json({ success: true, data });
};

const financial = async (req, res) => {
  const data = await reportService.getFinancialReport(req.branchFilter);
  res.json({ success: true, data });
};

const branchPerformance = async (req, res) => {
  const data = await reportService.getBranchPerformanceReport();
  res.json({ success: true, data });
};

module.exports = {
  production,
  inventory,
  customer,
  project,
  financial,
  branchPerformance,
};
