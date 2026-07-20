const ProductCategory = require('./model');
const Product = require('../products/model');
const WallCategoryTemplate = require('../wallTemplates/model');

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
    ProductCategory.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)),
    ProductCategory.countDocuments(filter),
  ]);

  return { categories, meta: buildMeta(Number(page), Number(limit), total) };
};

const createCategory = async (branchId, data) => {
  // Check for duplicates in same branch
  const existing = await ProductCategory.findOne({ branchId, name: data.name.trim() });
  if (existing) {
    const err = new Error(`Category '${data.name}' already exists in this branch`);
    err.statusCode = 409;
    throw err;
  }

  const category = await ProductCategory.create({
    ...data,
    branchId,
  });

  return category;
};

const updateCategory = async (id, branchFilter, data) => {
  const category = await ProductCategory.findOne({ _id: id, ...branchFilter });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.name && data.name.trim() !== category.name) {
    const existing = await ProductCategory.findOne({
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
  const category = await ProductCategory.findOne({ _id: id, ...branchFilter });
  if (!category) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }

  // Check if products are using this category
  const inUseByProduct = await Product.exists({ category: id });
  if (inUseByProduct) {
    const err = new Error('Cannot delete category because it is currently assigned to one or more products');
    err.statusCode = 400;
    throw err;
  }

  // Check if wall templates are using this category
  const inUseByTemplate = await WallCategoryTemplate.exists({ category: id });
  if (inUseByTemplate) {
    const err = new Error('Cannot delete category because it is currently assigned to one or more wall templates');
    err.statusCode = 400;
    throw err;
  }

  await ProductCategory.deleteOne({ _id: id });
  return { success: true };
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
