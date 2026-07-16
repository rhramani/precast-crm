const WallCategoryTemplate = require('./model');

// ─────────────────────────────────────────────
// 1. List Templates
// ─────────────────────────────────────────────
const listTemplates = async (branchFilter, { category, isActive } = {}) => {
  const filter = { ...branchFilter };
  if (category) filter.category = category;
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

  const templates = await WallCategoryTemplate.find(filter)
    .populate('products.productId', 'productName productCode category unit')
    .populate('installationMaterials.materialId', 'materialName materialCode category unit')
    .populate('createdBy', 'name email')
    .sort({ category: 1, isDefault: -1, createdAt: -1 });

  return templates;
};

// ─────────────────────────────────────────────
// 2. Get One Template
// ─────────────────────────────────────────────
const getTemplate = async (id, branchFilter) => {
  const template = await WallCategoryTemplate.findOne({ _id: id, ...branchFilter })
    .populate('products.productId', 'productName productCode category unit dimensions weight')
    .populate('installationMaterials.materialId', 'materialName materialCode category unit')
    .populate('createdBy', 'name email');

  if (!template) {
    const err = new Error('Wall category template not found');
    err.statusCode = 404;
    throw err;
  }
  return template;
};

// ─────────────────────────────────────────────
// 3. Create Template
// ─────────────────────────────────────────────
const createTemplate = async (branchId, userId, data) => {
  // If this is being set as default, unset any existing default for that category in this branch
  if (data.isDefault) {
    await WallCategoryTemplate.updateMany(
      { branchId, category: data.category, isDefault: true },
      { isDefault: false }
    );
  }

  const template = await WallCategoryTemplate.create({
    ...data,
    branchId,
    createdBy: userId,
  });

  return template.populate([
    { path: 'products.productId', select: 'productName productCode category unit' },
    { path: 'installationMaterials.materialId', select: 'materialName materialCode category unit' }
  ]);
};

// ─────────────────────────────────────────────
// 4. Update Template
// ─────────────────────────────────────────────
const updateTemplate = async (id, branchFilter, data) => {
  const template = await WallCategoryTemplate.findOne({ _id: id, ...branchFilter });
  if (!template) {
    const err = new Error('Wall category template not found');
    err.statusCode = 404;
    throw err;
  }

  // If setting as default, unset others in same category
  if (data.isDefault) {
    await WallCategoryTemplate.updateMany(
      { branchId: template.branchId, category: data.category || template.category, isDefault: true, _id: { $ne: id } },
      { isDefault: false }
    );
  }

  Object.assign(template, data);
  await template.save();

  return template.populate([
    { path: 'products.productId', select: 'productName productCode category unit' },
    { path: 'installationMaterials.materialId', select: 'materialName materialCode category unit' }
  ]);
};

// ─────────────────────────────────────────────
// 5. Delete Template
// ─────────────────────────────────────────────
const deleteTemplate = async (id, branchFilter) => {
  const template = await WallCategoryTemplate.findOneAndDelete({ _id: id, ...branchFilter });
  if (!template) {
    const err = new Error('Wall category template not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

// ─────────────────────────────────────────────
// 6. Set Default Template for a Category
// ─────────────────────────────────────────────
const setDefault = async (id, branchFilter) => {
  const template = await WallCategoryTemplate.findOne({ _id: id, ...branchFilter });
  if (!template) {
    const err = new Error('Wall category template not found');
    err.statusCode = 404;
    throw err;
  }

  // Unset all defaults for this category in this branch
  await WallCategoryTemplate.updateMany(
    { branchId: template.branchId, category: template.category },
    { isDefault: false }
  );

  // Set this one as default
  template.isDefault = true;
  await template.save();

  return template;
};

// ─────────────────────────────────────────────
// 7. Calculate product quantities for a given wall length (used by Site Calculator)
// ─────────────────────────────────────────────
const calculateFromTemplate = async (id, branchFilter, wallLengthMeters) => {
  const template = await WallCategoryTemplate.findOne({ _id: id, ...branchFilter })
    .populate('products.productId', 'productName productCode category unit');

  if (!template) {
    const err = new Error('Wall category template not found');
    err.statusCode = 404;
    throw err;
  }

  const length = Number(wallLengthMeters);
  const bays = Math.ceil(length / template.baySpacingMeters) || 1;

  const productBreakdown = template.products.map((line) => ({
    productId: line.productId._id,
    productName: line.productId.productName,
    productCode: line.productId.productCode,
    category: line.productId.category,
    unit: line.unit,
    qtyPerBay: line.qtyPerBay,
    totalQty: Math.ceil(line.qtyPerBay * bays),
    note: line.note,
  }));

  return {
    template: {
      id: template._id,
      name: template.name,
      category: template.category,
      baySpacingMeters: template.baySpacingMeters,
    },
    wallLengthMeters: length,
    bays,
    productBreakdown,
  };
};

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefault,
  calculateFromTemplate,
};
