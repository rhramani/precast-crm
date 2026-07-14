const BOM = require('../bom/model');
const RawMaterial = require('../rawMaterials/model');
const Product = require('../products/model');

/**
 * Calculates max producible quantity based on current stock of raw materials
 * and the product's active BOM.
 * Returns: { maxQuantity, costPerUnit, materialsNeeded: [...] }
 */
const calculateCapacity = async (productId, branchFilter, targetQuantity = 0) => {
  // 1. Fetch active BOM
  const bom = await BOM.findOne({ productId, isActive: true, ...branchFilter })
    .populate('items.materialId', 'materialName materialCode currentQuantity unit purchaseRate');

  if (!bom) {
    const err = new Error('No active BOM found for this product in the selected branch. Please define a BOM first.');
    err.statusCode = 404;
    throw err;
  }

  let maxProducible = Infinity;
  let limitingMaterial = null;
  const materialsReport = [];
  let costPerUnit = 0;

  for (const item of bom.items) {
    const material = item.materialId;
    if (!material) continue;

    // quantity needed including wastage
    const qtyPerUnit = item.quantityRequired * (1 + (item.wastagePercent || 0) / 100);
    const costForMat = qtyPerUnit * (material.purchaseRate || 0);
    costPerUnit += costForMat;

    const available = material.currentQuantity || 0;
    const maxForThis = qtyPerUnit > 0 ? Math.floor(available / qtyPerUnit) : Infinity;

    if (maxForThis < maxProducible) {
      maxProducible = maxForThis;
      limitingMaterial = {
        materialId: material._id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        available,
        neededPerUnit: qtyPerUnit,
      };
    }

    // Shortage calculations if a target quantity was requested
    let shortage = 0;
    let requiredTotal = 0;
    if (targetQuantity > 0) {
      requiredTotal = qtyPerUnit * targetQuantity;
      if (requiredTotal > available) {
        shortage = requiredTotal - available;
      }
    }

    materialsReport.push({
      materialId: material._id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      availableStock: available,
      requiredPerUnit: qtyPerUnit,
      unit: material.unit,
      requiredTotalForTarget: requiredTotal,
      shortageForTarget: shortage,
      purchaseRate: material.purchaseRate,
    });
  }

  const finalMax = maxProducible === Infinity ? 0 : maxProducible;

  return {
    productId,
    bomId: bom._id,
    bomVersion: bom.version,
    maxQuantity: finalMax,
    costPerUnit,
    limitingMaterial: finalMax === 0 && bom.items.length > 0 && !limitingMaterial ? bom.items[0].materialId : limitingMaterial,
    materials: materialsReport,
  };
};

module.exports = { calculateCapacity };
