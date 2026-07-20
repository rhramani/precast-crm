const mongoose = require('mongoose');
const RawMaterial = require('./model');
const MaterialLedger = require('./ledgerModel');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Materials (scoped by branchFilter)
const listMaterials = async (branchFilter, { page = 1, limit = 10, search, category, sortBy = 'createdAt', sortOrder = 'desc' }) => {
  const filter = { ...branchFilter };

  if (search) {
    filter.$or = [
      { materialName: { $regex: search, $options: 'i' } },
      { materialCode: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) {
    filter.category = category;
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [materials, total] = await Promise.all([
    RawMaterial.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('supplierId', 'supplierName')
      .populate('category', 'name'),
    RawMaterial.countDocuments(filter),
  ]);

  return { materials, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Material
const createMaterial = async (branchId, data) => {
  // Auto-generate unique materialCode sequentially within this branch
  const lastRM = await RawMaterial.findOne({ branchId }).sort({ materialCode: -1 });
  let suffix = 1;
  if (lastRM && lastRM.materialCode) {
    const match = lastRM.materialCode.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const materialCode = `RM-${String(suffix).padStart(4, '0')}`;

  const material = await RawMaterial.create({
    ...data,
    materialCode,
    branchId,
    currentQuantity: data.currentQuantity || 0,
    date: data.date || undefined,
  });

  return material;
};

// 3. Update Material
const updateMaterial = async (id, branchFilter, data) => {
  const material = await RawMaterial.findOne({ _id: id, ...branchFilter });
  if (!material) {
    const err = new Error('Raw material not found');
    err.statusCode = 404;
    throw err;
  }

  // If materialCode is falsy (empty string or null), do not overwrite the existing code
  if (data.hasOwnProperty('materialCode') && !data.materialCode) {
    delete data.materialCode;
  }

  // If code is being updated, verify it doesn't conflict inside the same branch
  if (data.materialCode && data.materialCode !== material.materialCode) {
    const conflict = await RawMaterial.findOne({
      branchId: material.branchId,
      materialCode: data.materialCode,
    });
    if (conflict) {
      const err = new Error(`Material code '${data.materialCode}' is already in use in this branch`);
      err.statusCode = 409;
      throw err;
    }
  }

  Object.assign(material, data);
  await material.save();
  return material;
};

// 4. Stock In
const stockIn = async (id, branchFilter, { quantity, remarks }, userId) => {
  const material = await RawMaterial.findOne({ _id: id, ...branchFilter });
  if (!material) {
    const err = new Error('Raw material not found');
    err.statusCode = 404;
    throw err;
  }

  material.currentQuantity += quantity;
  const balanceAfter = material.currentQuantity;
  await material.save();

  // Write ledger
  const ledger = await MaterialLedger.create({
    branchId: material.branchId,
    materialId: material._id,
    type: 'in',
    quantity,
    referenceType: 'manual',
    balanceAfter,
    remarks: remarks || 'Manual stock-in receipt',
    createdBy: userId,
  });

  return { material, ledger };
};

// 5. Stock Out
const stockOut = async (id, branchFilter, { quantity, remarks }, userId) => {
  const material = await RawMaterial.findOne({ _id: id, ...branchFilter });
  if (!material) {
    const err = new Error('Raw material not found');
    err.statusCode = 404;
    throw err;
  }

  if (material.currentQuantity < quantity) {
    const err = new Error(`Insufficient stock. Current: ${material.currentQuantity} ${material.unit}, Requested: ${quantity}`);
    err.statusCode = 400;
    throw err;
  }

  material.currentQuantity -= quantity;
  const balanceAfter = material.currentQuantity;
  await material.save();

  // Write ledger
  const ledger = await MaterialLedger.create({
    branchId: material.branchId,
    materialId: material._id,
    type: 'out',
    quantity,
    referenceType: 'manual',
    balanceAfter,
    remarks: remarks || 'Manual stock-out issuance',
    createdBy: userId,
  });

  return { material, ledger };
};

// 6. Adjustment
const adjustStock = async (id, branchFilter, { quantity, remarks }, userId) => {
  const material = await RawMaterial.findOne({ _id: id, ...branchFilter });
  if (!material) {
    const err = new Error('Raw material not found');
    err.statusCode = 404;
    throw err;
  }

  const finalQty = material.currentQuantity + quantity;
  if (finalQty < 0) {
    const err = new Error(`Cannot adjust stock below 0. Current: ${material.currentQuantity}, Adjustment: ${quantity}`);
    err.statusCode = 400;
    throw err;
  }

  material.currentQuantity = finalQty;
  const balanceAfter = finalQty;
  await material.save();

  // Write ledger
  const ledger = await MaterialLedger.create({
    branchId: material.branchId,
    materialId: material._id,
    type: 'adjustment',
    quantity: Math.abs(quantity),
    referenceType: 'manual',
    balanceAfter,
    remarks: remarks || `Stock adjustment (${quantity >= 0 ? '+' : ''}${quantity})`,
    createdBy: userId,
  });

  return { material, ledger };
};

// 7. Transfer
const transferStock = async ({ materialCode, fromBranchId, toBranchId, quantity, remarks }, userId) => {
  if (fromBranchId === toBranchId) {
    const err = new Error('Cannot transfer to and from the same branch');
    err.statusCode = 400;
    throw err;
  }

  // Find source material
  const sourceMaterial = await RawMaterial.findOne({ branchId: fromBranchId, materialCode });
  if (!sourceMaterial) {
    const err = new Error(`Material '${materialCode}' not found in source branch`);
    err.statusCode = 404;
    throw err;
  }

  if (sourceMaterial.currentQuantity < quantity) {
    const err = new Error(`Insufficient stock for transfer. Current in source: ${sourceMaterial.currentQuantity} ${sourceMaterial.unit}, Requested: ${quantity}`);
    err.statusCode = 400;
    throw err;
  }

  // Find or create target material in target branch
  let targetMaterial = await RawMaterial.findOne({ branchId: toBranchId, materialCode });
  if (!targetMaterial) {
    // Replicate structural properties from source
    targetMaterial = new RawMaterial({
      branchId: toBranchId,
      materialCode: sourceMaterial.materialCode,
      materialName: sourceMaterial.materialName,
      category: sourceMaterial.category,
      unit: sourceMaterial.unit,
      purchaseRate: sourceMaterial.purchaseRate,
      currentQuantity: 0,
      date: sourceMaterial.date,
    });
  }

  // Execute sequence
  sourceMaterial.currentQuantity -= quantity;
  const sourceBalance = sourceMaterial.currentQuantity;
  await sourceMaterial.save();

  targetMaterial.currentQuantity += quantity;
  const targetBalance = targetMaterial.currentQuantity;
  await targetMaterial.save();

  // Ledger entries
  const fromLedger = await MaterialLedger.create({
    branchId: fromBranchId,
    materialId: sourceMaterial._id,
    type: 'transfer',
    quantity,
    referenceType: 'transfer',
    balanceAfter: sourceBalance,
    remarks: remarks || `Transferred to branch ID: ${toBranchId}`,
    createdBy: userId,
  });

  const toLedger = await MaterialLedger.create({
    branchId: toBranchId,
    materialId: targetMaterial._id,
    type: 'transfer',
    quantity,
    referenceType: 'transfer',
    balanceAfter: targetBalance,
    remarks: remarks || `Transferred from branch ID: ${fromBranchId}`,
    createdBy: userId,
  });

  return { sourceMaterial, targetMaterial, fromLedger, toLedger };
};

// 8. List Ledger (with material filter and scope check)
const listLedger = async (materialId, branchFilter, { page = 1, limit = 10 }) => {
  // Enforce branch scope on the material lookup first
  const material = await RawMaterial.findOne({ _id: materialId, ...branchFilter });
  if (!material) {
    const err = new Error('Raw material not found');
    err.statusCode = 404;
    throw err;
  }

  const filter = { materialId: material._id };
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    MaterialLedger.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    MaterialLedger.countDocuments(filter),
  ]);

  return { logs, meta: buildMeta(Number(page), Number(limit), total) };
};

// 9. Get Low Stock Materials
const getLowStock = async (branchFilter) => {
  // Finds materials scoped to branch filter where quantity <= 0
  const materials = await RawMaterial.find({
    ...branchFilter,
    currentQuantity: { $lte: 0 },
  });
  return materials;
};

// 10. Delete Material
const deleteMaterial = async (id, branchFilter) => {
  const material = await RawMaterial.findOneAndDelete({ _id: id, ...branchFilter });
  if (!material) {
    const err = new Error('Raw material not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

module.exports = {
  listMaterials,
  createMaterial,
  updateMaterial,
  stockIn,
  stockOut,
  adjustStock,
  transferStock,
  listLedger,
  getLowStock,
  deleteMaterial,
};
