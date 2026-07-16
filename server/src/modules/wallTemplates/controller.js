const service = require('./service');

// GET /wall-templates
const list = async (req, res) => {
  const { category, isActive } = req.query;
  const templates = await service.listTemplates(req.branchFilter, { category, isActive });
  res.json({ success: true, data: { templates } });
};

// GET /wall-templates/:id
const getOne = async (req, res) => {
  const template = await service.getTemplate(req.params.id, req.branchFilter);
  res.json({ success: true, data: { template } });
};

// POST /wall-templates
const create = async (req, res) => {
  const branchId = req.user.role === 'branch' ? req.user.branchId : req.body.branchId;
  const userId = req.user.userId;
  const template = await service.createTemplate(branchId, userId, req.body);
  res.status(201).json({ success: true, message: 'Wall category template created successfully', data: { template } });
};

// PUT /wall-templates/:id
const update = async (req, res) => {
  const template = await service.updateTemplate(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Wall category template updated successfully', data: { template } });
};

// DELETE /wall-templates/:id
const remove = async (req, res) => {
  await service.deleteTemplate(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Wall category template deleted successfully' });
};

// PATCH /wall-templates/:id/set-default
const setDefault = async (req, res) => {
  const template = await service.setDefault(req.params.id, req.branchFilter);
  res.json({ success: true, message: `"${template.name}" is now the default template for ${template.category}`, data: { template } });
};

// POST /wall-templates/:id/calculate
const calculate = async (req, res) => {
  const { wallLengthMeters } = req.body;
  if (!wallLengthMeters || isNaN(wallLengthMeters) || Number(wallLengthMeters) <= 0) {
    return res.status(400).json({ success: false, message: 'wallLengthMeters must be a positive number' });
  }
  const result = await service.calculateFromTemplate(req.params.id, req.branchFilter, wallLengthMeters);
  res.json({ success: true, data: result });
};

module.exports = { list, getOne, create, update, remove, setDefault, calculate };
