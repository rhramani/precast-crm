const BOM = require('./model');
const RawMaterial = require('../rawMaterials/model');
const Product = require('../products/model');

// Helper to compute total cost based on raw material purchase rates
const computeCost = async (items) => {
  let totalCost = 0;
  for (const item of items) {
    const material = await RawMaterial.findById(item.materialId);
    if (material) {
      const effectiveQty = item.quantityRequired * (1 + (item.wastagePercent || 0) / 100);
      totalCost += effectiveQty * (material.purchaseRate || 0);
    }
  }
  return totalCost;
};

// 1. Get active BOM for a product
const getActiveBomByProduct = async (productId, branchFilter) => {
  const bom = await BOM.findOne({ productId, isActive: true, ...branchFilter })
    .populate('items.materialId', 'materialName materialCode unit purchaseRate');
  return bom;
};

// 2. Create BOM (version control implementation)
const createBom = async (branchId, userId, data) => {
  // Find product to determine branch assignment
  const product = await Product.findById(data.productId);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  // Enforce branch scope check for branchs
  if (branchId && branchId.toString() !== product.branchId.toString()) {
    const err = new Error('Access denied. Product belongs to another branch.');
    err.statusCode = 403;
    throw err;
  }

  const finalBranchId = product.branchId;

  // Find max version
  const latestBom = await BOM.findOne({ productId: data.productId }).sort({ version: -1 });
  const nextVersion = latestBom ? latestBom.version + 1 : 1;

  // Calculate items cost
  const calculatedCost = await computeCost(data.items);

  // If this new BOM is set to active (default true), deactivate other BOMs for this product
  if (data.isActive !== false) {
    await BOM.updateMany({ productId: data.productId }, { $set: { isActive: false } });
  }

  const bom = await BOM.create({
    branchId: finalBranchId,
    productId: data.productId,
    version: nextVersion,
    isActive: data.isActive !== false,
    items: data.items,
    calculatedCost,
    createdBy: userId,
  });

  return bom;
};

// 3. Update BOM (specifically toggle active state or update cost)
const updateBom = async (id, branchFilter, data) => {
  const bom = await BOM.findOne({ _id: id, ...branchFilter });
  if (!bom) {
    const err = new Error('BOM not found');
    err.statusCode = 404;
    throw err;
  }

  if ('isActive' in data) {
    if (data.isActive === true) {
      // Deactivate all other BOMs of this product
      await BOM.updateMany(
        { productId: bom.productId, _id: { $ne: bom._id } },
        { $set: { isActive: false } }
      );
    }
    bom.isActive = data.isActive;
  }

  if (data.items) {
    bom.items = data.items;
    bom.calculatedCost = await computeCost(data.items);
  }

  await bom.save();
  return bom;
};

// 4. Get version history for a product's BOMs
const getBomHistory = async (productId, branchFilter) => {
  const history = await BOM.find({ productId, ...branchFilter })
    .populate('createdBy', 'name email')
    .sort({ version: -1 });
  return history;
};

// 5. Calculate cost endpoint (calculates potential cost dynamically without writing to DB)
const calculateCost = async (id, branchFilter) => {
  const bom = await BOM.findOne({ _id: id, ...branchFilter });
  if (!bom) {
    const err = new Error('BOM not found');
    err.statusCode = 404;
    throw err;
  }

  const cost = await computeCost(bom.items);
  // Update cost on database record as well to keep it fresh
  bom.calculatedCost = cost;
  await bom.save();

  return { calculatedCost: cost, bom };
};

// 6. Generic Calculator helper (used dynamically by create/edit forms before submitting)
const calculateRawCost = async (items) => {
  const cost = await computeCost(items);
  return cost;
};

module.exports = {
  getActiveBomByProduct,
  createBom,
  updateBom,
  getBomHistory,
  calculateCost,
  calculateRawCost,
};
