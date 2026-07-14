const bomService = require('./service');

const getActive = async (req, res) => {
  const bom = await bomService.getActiveBomByProduct(req.params.productId, req.branchFilter);
  if (!bom) {
    return res.json({ success: true, data: { bom: null }, message: 'No active BOM found for this product' });
  }
  res.json({ success: true, data: { bom } });
};

const create = async (req, res) => {
  const userBranchId = req.user.role === 'branch' ? req.user.branchId : null;
  const bom = await bomService.createBom(userBranchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'BOM version created successfully', data: { bom } });
};

const update = async (req, res) => {
  const bom = await bomService.updateBom(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'BOM updated successfully', data: { bom } });
};

const history = async (req, res) => {
  const boms = await bomService.getBomHistory(req.params.id, req.branchFilter);
  res.json({ success: true, data: { boms } });
};

const calculateCost = async (req, res) => {
  const result = await bomService.calculateCost(req.params.id, req.branchFilter);
  res.json({
    success: true,
    message: 'BOM cost calculated successfully',
    data: { calculatedCost: result.calculatedCost, bom: result.bom },
  });
};

const calculateRawItemsCost = async (req, res) => {
  const cost = await bomService.calculateRawCost(req.body.items || []);
  res.json({ success: true, data: { calculatedCost: cost } });
};

module.exports = {
  getActive,
  create,
  update,
  history,
  calculateCost,
  calculateRawItemsCost,
};
