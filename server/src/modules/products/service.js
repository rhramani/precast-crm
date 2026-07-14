const Product = require('./model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const listProducts = async (branchFilter, { page = 1, limit = 10, search, category, status }) => {
  const filter = { ...branchFilter };

  if (search) {
    filter.$or = [
      { productName: { $regex: search, $options: 'i' } },
      { productCode: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) filter.category = category;
  if (status)   filter.status = status;

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);

  return { products, meta: buildMeta(Number(page), Number(limit), total) };
};

const createProduct = async (branchId, data) => {
  // Auto-generate unique productCode sequentially within this branch
  const lastProd = await Product.findOne({ branchId }).sort({ productCode: -1 });
  let suffix = 1;
  if (lastProd && lastProd.productCode) {
    const match = lastProd.productCode.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const productCode = `PR-${String(suffix).padStart(4, '0')}`;

  const product = await Product.create({
    ...data,
    productCode,
    branchId,
  });

  return product;
};

const updateProduct = async (id, branchFilter, data) => {
  const product = await Product.findOne({ _id: id, ...branchFilter });
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.productCode && data.productCode !== product.productCode) {
    const conflict = await Product.findOne({
      branchId: product.branchId,
      productCode: data.productCode,
    });
    if (conflict) {
      const err = new Error(`Product code '${data.productCode}' already exists in this branch`);
      err.statusCode = 409;
      throw err;
    }
  }

  Object.assign(product, data);
  await product.save();
  return product;
};

const updateProductStatus = async (id, branchFilter, status) => {
  const product = await Product.findOneAndUpdate(
    { _id: id, ...branchFilter },
    { status },
    { new: true }
  );

  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  return product;
};

const deleteProduct = async (id, branchFilter) => {
  const product = await Product.findOneAndDelete({ _id: id, ...branchFilter });
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
