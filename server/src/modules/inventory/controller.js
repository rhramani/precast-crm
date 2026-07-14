const inventoryService = require('./service');

const getRawMaterials = async (req, res) => {
  const result = await inventoryService.getRawMaterialsInventory(req.branchFilter);
  res.json({ success: true, data: result });
};

const getWip = async (req, res) => {
  const result = await inventoryService.getWipInventory(req.branchFilter);
  res.json({ success: true, data: result });
};

const getFinishedGoods = async (req, res) => {
  const result = await inventoryService.getFinishedGoodsInventory(req.branchFilter);
  res.json({ success: true, data: result });
};

module.exports = {
  getRawMaterials,
  getWip,
  getFinishedGoods,
};
