const rawMaterialService = require('./service');
const { logActivity } = require('../../middlewares/auditLogger');

const list = async (req, res) => {
  const { page, limit, search, category, sortBy, sortOrder } = req.query;
  const result = await rawMaterialService.listMaterials(req.branchFilter, {
    page,
    limit,
    search,
    category,
    sortBy,
    sortOrder,
  });
  res.json({ success: true, data: { materials: result.materials }, meta: result.meta });
};

const create = async (req, res) => {
  // Determine branch assignment:
  // If super_admin, read from body; if branch, enforce branch scope from token.
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a raw material');
    err.statusCode = 400;
    throw err;
  }

  const material = await rawMaterialService.createMaterial(branchId, req.body);
  await logActivity(req.user.userId, 'create', 'raw_materials', material._id, req.ip);
  res.status(201).json({ success: true, message: 'Raw material created successfully', data: { material } });
};

const update = async (req, res) => {
  const material = await rawMaterialService.updateMaterial(req.params.id, req.branchFilter, req.body);
  await logActivity(req.user.userId, 'update', 'raw_materials', material._id, req.ip);
  res.json({ success: true, message: 'Raw material updated successfully', data: { material } });
};

const stockIn = async (req, res) => {
  const { material, ledger } = await rawMaterialService.stockIn(
    req.params.id,
    req.branchFilter,
    req.body,
    req.user.userId
  );
  res.json({ success: true, message: 'Stock received and ledger updated', data: { material, ledger } });
};

const stockOut = async (req, res) => {
  const { material, ledger } = await rawMaterialService.stockOut(
    req.params.id,
    req.branchFilter,
    req.body,
    req.user.userId
  );
  res.json({ success: true, message: 'Stock issued and ledger updated', data: { material, ledger } });
};

const adjust = async (req, res) => {
  const { material, ledger } = await rawMaterialService.adjustStock(
    req.params.id,
    req.branchFilter,
    req.body,
    req.user.userId
  );
  await logActivity(req.user.userId, 'stock_adjustment', 'raw_materials', material._id, req.ip);
  res.json({ success: true, message: 'Stock adjusted and ledger updated', data: { material, ledger } });
};

const transfer = async (req, res) => {
  const { sourceMaterial, targetMaterial, fromLedger, toLedger } = await rawMaterialService.transferStock(
    req.body,
    req.user.userId
  );
  res.json({
    success: true,
    message: 'Inter-branch stock transfer completed',
    data: { sourceMaterial, targetMaterial, fromLedger, toLedger },
  });
};

const ledger = async (req, res) => {
  const { page, limit } = req.query;
  const result = await rawMaterialService.listLedger(req.params.id, req.branchFilter, { page, limit });
  res.json({ success: true, data: { logs: result.logs }, meta: result.meta });
};

const lowStock = async (req, res) => {
  const materials = await rawMaterialService.getLowStock(req.branchFilter);
  res.json({ success: true, data: { materials } });
};

const remove = async (req, res) => {
  await rawMaterialService.deleteMaterial(req.params.id, req.branchFilter);
  await logActivity(req.user.userId, 'delete', 'raw_materials', req.params.id, req.ip);
  res.json({ success: true, message: 'Raw material deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  stockIn,
  stockOut,
  adjust,
  transfer,
  ledger,
  lowStock,
  remove,
};
