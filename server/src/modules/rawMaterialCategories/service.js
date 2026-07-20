const RawMaterialCategory = require('./model');
const RawMaterial = require('../rawMaterials/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const listCategories = async (branchFilter, { page = 1, limit = 10, search }) => {
  const filter = { ...branchFilter };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    RawMaterialCategory.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)),
    RawMaterialCategory.countDocuments(filter),
  ]);

  return { categories, meta: buildMeta(Number(page), Number(limit), total) };
};

const createCategory = async (branchId, data) => {
  // Check for duplicates in same branch
  const existing = await RawMaterialCategory.findOne({ branchId, name: data.name.trim() });
  if (existing) {
    const err = new Error(`Category '${data.name}' already exists in this branch`);
    err.statusCode = 409;
    throw err;
  }

  const category = await RawMaterialCategory.create({
    ...data,
    branchId,
  });

  return category;
};

const updateCategory = async (id, branchFilter, data) => {
  const category = await RawMaterialCategory.findOne({ _id: id, ...branchFilter });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.name && data.name.trim() !== category.name) {
    const existing = await RawMaterialCategory.findOne({
      branchId: category.branchId,
      name: data.name.trim(),
      _id: { $ne: id },
    });
    if (existing) {
      const err = new Error(`Category '${data.name}' already exists in this branch`);
      err.statusCode = 409;
      throw err;
    }
  }

  Object.assign(category, data);
  await category.save();
  return category;
};

const deleteCategory = async (id, branchFilter) => {
  const category = await RawMaterialCategory.findOne({ _id: id, ...branchFilter });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  // Check if raw materials are using this category
  const inUse = await RawMaterial.exists({ category: id });
  if (inUse) {
    const err = new Error('Cannot delete category because it is currently assigned to one or more raw materials');
    err.statusCode = 400;
    throw err;
  }

  await RawMaterialCategory.deleteOne({ _id: id });
  return { success: true };
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
