const equipmentService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, status, type, sortBy, sortOrder } = req.query;
  const result = await equipmentService.listEquipment(req.branchFilter, { page, limit, search, status, type, sortBy, sortOrder });
  res.json({ success: true, data: { equipment: result.equipment }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to register equipment');
    err.statusCode = 400;
    throw err;
  }

  const equipment = await equipmentService.createEquipment(branchId, req.body);
  res.status(201).json({ success: true, message: 'Equipment registered successfully', data: { equipment } });
};

const update = async (req, res) => {
  const equipment = await equipmentService.updateEquipment(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Equipment details updated', data: { equipment } });
};

const allocate = async (req, res) => {
  const { siteId } = req.body;
  const equipment = await equipmentService.allocateEquipment(req.params.id, req.branchFilter, siteId);
  res.json({ success: true, message: 'Equipment allocated to site', data: { equipment } });
};

const release = async (req, res) => {
  const equipment = await equipmentService.releaseEquipment(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Equipment released back to fleet', data: { equipment } });
};

const remove = async (req, res) => {
  await equipmentService.deleteEquipment(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Equipment removed from fleet' });
};

module.exports = {
  list,
  create,
  update,
  allocate,
  release,
  remove,
};
