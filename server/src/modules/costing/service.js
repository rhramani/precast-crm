const Site = require('../sites/model');
const SiteCalculation = require('../sites/calculationModel');
const Dispatch = require('../dispatch/model');
const Installation = require('../installation/model');
const Expense = require('../expenses/model');
const Quotation = require('../quotations/model');
const Product = require('../products/model');
const Bom = require('../bom/model');
const RawMaterial = require('../rawMaterials/model');
const Labour = require('../labour/model');

const calculateSiteCosting = async (siteId, branchFilter) => {
  const site = await Site.findOne({ _id: siteId, ...branchFilter }).populate('projectId', 'projectName customerId');
  if (!site) {
    const err = new Error('Site record not found');
    err.statusCode = 404;
    throw err;
  }

  // 1. Fetch estimations
  const estimationRecord = await SiteCalculation.findOne({ siteId: site._id }).sort({ createdAt: -1 });
  const estimatedCost = estimationRecord ? estimationRecord.calculated?.estimatedCost || 0 : 0;
  const estimatedMaterials = estimationRecord ? estimationRecord.calculated : null;

  // 2. Fetch actual direct site expenses
  const siteExpenses = await Expense.find({ siteId: site._id });
  const actualExpenseCost = siteExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // 3. Fetch actual materials consumed (via dispatches confirmed)
  const dispatches = await Dispatch.find({ siteId: site._id, status: { $in: ['dispatched', 'delivered'] } });
  let actualMaterialCost = 0;

  for (const disp of dispatches) {
    for (const item of disp.items) {
      // Find product
      const product = await Product.findById(item.productId);
      if (!product) continue;

      // Find active BOM for the product
      // Find active BOM for the product
      let bom = await Bom.findOne({ productId: product._id, isActive: true });
      if (!bom) {
        bom = await Bom.findOne({ productId: product._id }).sort({ version: -1 });
      }
      if (!bom) {
        // Fallback: no BOM defined, material cost is zero
        continue;
      }

      // Sum raw material costs inside the BOM
      const bomItems = bom.items || [];
      for (const ingredient of bomItems) {
        const material = await RawMaterial.findById(ingredient.materialId);
        if (!material) continue;

        // Cost = rate * quantity required per unit (with wastage) * dispatched product quantity
        const rate = material.purchaseRate || 0;
        const qtyPerUnit = ingredient.quantityRequired * (1 + (ingredient.wastagePercent || 0) / 100);
        const totalIngredientQty = qtyPerUnit * item.quantity;
        actualMaterialCost += rate * totalIngredientQty;
      }
    }
  }

  // 4. Fetch actual labor costs (via installation progress logs)
  const installations = await Installation.find({ siteId: site._id });
  // Dynamic daily wage rate based on average active labour in the branch
  const activeLabour = await Labour.find({ status: 'active', branchId: site.branchId });
  const averageWage = activeLabour.length > 0 
    ? activeLabour.reduce((sum, l) => sum + (l.dailyWages || 0), 0) / activeLabour.length 
    : 800; // standard fallback only if no active labour is registered in the database

  let actualLaborCost = 0;
  installations.forEach((inst) => {
    const workerCount = inst.labourCount || 0;
    actualLaborCost += (workerCount * averageWage);
  });

  // 5. Fetch revenue share from accepted quotation
  let siteRevenue = 0;
  const quotation = await Quotation.findOne({ projectId: site.projectId?._id, status: 'accepted' });

  if (quotation) {
    // Find all sites in this project to distribute revenue proportionally by site area
    const projectSites = await Site.find({ projectId: site.projectId?._id });
    const totalArea = projectSites.reduce((sum, s) => sum + (s.siteArea || 0), 0);

    if (totalArea > 0) {
      const proportion = (site.siteArea || 0) / totalArea;
      siteRevenue = quotation.grandTotal * proportion;
    } else {
      siteRevenue = quotation.grandTotal;
    }
  }

  // 6. Total costs & margins calculations
  const totalActualCost = actualMaterialCost + actualLaborCost + actualExpenseCost;
  const profitAmount = siteRevenue - totalActualCost;
  const marginPercent = siteRevenue > 0 ? (profitAmount / siteRevenue) * 100 : 0;

  return {
    site: {
      siteId: site._id,
      siteName: site.siteName,
      projectName: site.projectId?.projectName,
      siteArea: site.siteArea,
      status: site.status,
    },
    revenue: siteRevenue,
    estimated: {
      totalCost: estimatedCost,
      materials: estimatedMaterials,
    },
    actual: {
      materialCost: actualMaterialCost,
      laborCost: actualLaborCost,
      expenseCost: actualExpenseCost,
      totalCost: totalActualCost,
    },
    margin: {
      amount: profitAmount,
      percent: marginPercent,
    },
  };
};

module.exports = {
  calculateSiteCosting,
};
