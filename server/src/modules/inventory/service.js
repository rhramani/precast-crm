const RawMaterial = require('../rawMaterials/model');
const ProductionOrder = require('../production/model');
const FinishedGoodsInventory = require('./model');

// 1. Raw Materials Inventory Report (with valuations)
const getRawMaterialsInventory = async (branchFilter) => {
  const materials = await RawMaterial.find(branchFilter)
    .sort({ currentQuantity: -1 })
    .populate('category', 'name');

  const summary = materials.map((m) => {
    const qty = m.currentQuantity || 0;
    const rate = m.purchaseRate || 0;
    return {
      _id: m._id,
      materialCode: m.materialCode,
      materialName: m.materialName,
      category: m.category?.name || m.category,
      unit: m.unit,
      currentQuantity: qty,
      purchaseRate: rate,
      totalValuation: qty * rate,
      isLow: qty <= 0,
    };
  });

  const totalValue = summary.reduce((acc, curr) => acc + curr.totalValuation, 0);

  return { items: summary, totalValuation: totalValue };
};

// 2. WIP (Work in Progress) Inventory
const getWipInventory = async (branchFilter) => {
  // Query production orders in 'pending' or 'in_production' state
  const activeOrders = await ProductionOrder.find({
    ...branchFilter,
    status: { $in: ['pending', 'in_production'] },
  }).populate('productId', 'productName productCode unit');

  const items = activeOrders.map((o) => ({
    orderId: o._id,
    orderNumber: o.orderNumber,
    productName: o.productId?.productName || '—',
    productCode: o.productId?.productCode || '—',
    plannedQuantity: o.plannedQuantity,
    status: o.status,
    startDate: o.startDate,
  }));

  const totalOrders = activeOrders.length;
  const totalVolume = activeOrders.reduce((acc, curr) => acc + curr.plannedQuantity, 0);

  return { items, totalOrders, totalVolume };
};

// 3. Finished Goods Inventory
const getFinishedGoodsInventory = async (branchFilter) => {
  const inventory = await FinishedGoodsInventory.find(branchFilter)
    .populate('productId', 'productName productCode unit category dimensions weight');

  const summary = inventory.map((fg) => {
    const qty = fg.availableStock || 0;
    // valuation using estimated cost from active BOM if possible, or just default cost placeholder
    return {
      _id: fg._id,
      productId: fg.productId?._id,
      productName: fg.productId?.productName || '—',
      productCode: fg.productId?.productCode || '—',
      category: fg.productId?.category || '—',
      unit: fg.productId?.unit || '—',
      availableStock: qty,
      reservedStock: fg.reservedStock || 0,
      damagedStock: fg.damagedStock || 0,
      dispatchReadyStock: fg.dispatchReadyStock || 0,
    };
  });

  const totalQty = summary.reduce((acc, curr) => acc + curr.availableStock, 0);

  return { items: summary, totalQuantity: totalQty };
};

module.exports = {
  getRawMaterialsInventory,
  getWipInventory,
  getFinishedGoodsInventory,
};
