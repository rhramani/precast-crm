const productService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, category, status } = req.query;
  const result = await productService.listProducts(req.branchFilter, {
    page,
    limit,
    search,
    category,
    status,
  });
  res.json({ success: true, data: { products: result.products }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to create a product');
    err.statusCode = 400;
    throw err;
  }

  const product = await productService.createProduct(branchId, req.body);
  res.status(201).json({ success: true, message: 'Product created successfully', data: { product } });
};

const update = async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Product updated successfully', data: { product } });
};

const updateStatus = async (req, res) => {
  const product = await productService.updateProductStatus(req.params.id, req.branchFilter, req.body.status);
  res.json({ success: true, message: `Product is now ${req.body.status}`, data: { product } });
};

const remove = async (req, res) => {
  await productService.deleteProduct(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Product deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  updateStatus,
  remove,
};
