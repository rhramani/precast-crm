const productCategoryService = require('./service');
const { logActivity } = require('../../middlewares/auditLogger');

const list = async (req, res) => {
  const { page, limit, search } = req.query;
  const result = await productCategoryService.listCategories(req.branchFilter, {
    page,
    limit,
    search,
  });
  res.json({ success: true, data: { categories: result.categories }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a category');
    err.statusCode = 400;
    throw err;
  }

  const category = await productCategoryService.createCategory(branchId, req.body);
  await logActivity(req.user.userId, 'create', 'product_categories', category._id, req.ip);
  res.status(201).json({ success: true, message: 'Category created successfully', data: { category } });
};

const update = async (req, res) => {
  const category = await productCategoryService.updateCategory(req.params.id, req.branchFilter, req.body);
  await logActivity(req.user.userId, 'update', 'product_categories', category._id, req.ip);
  res.json({ success: true, message: 'Category updated successfully', data: { category } });
};

const remove = async (req, res) => {
  await productCategoryService.deleteCategory(req.params.id, req.branchFilter);
  await logActivity(req.user.userId, 'delete', 'product_categories', req.params.id, req.ip);
  res.json({ success: true, message: 'Category deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  remove,
};
