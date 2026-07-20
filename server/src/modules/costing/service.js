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
const Project = require('../projects/model');

const calculateSiteCosting = async (siteId, branchFilter) => {
  const site = await Site.findOne({ _id: siteId, ...branchFilter }).populate('projectId', 'projectName customerId');
  if (!site) {
    const err = new Error('Site record not found');
    err.statusCode = 404;
    throw err;
  }

  const projectIdObj = site.projectId?._id || site.projectId;

  // 1. Fetch estimations (or auto-calculate dynamically if missing)
  let estimationRecord = await SiteCalculation.findOne({ siteId: site._id }).sort({ createdAt: -1 });
  if (!estimationRecord) {
    try {
      const { calculateRequirements } = require('../sites/service');
      await calculateRequirements(site._id);
      estimationRecord = await SiteCalculation.findOne({ siteId: site._id }).sort({ createdAt: -1 });
    } catch (e) {
      console.error('Error auto-calculating site requirements for costing:', e);
    }
  }

  const estimatedCost = Math.round(estimationRecord ? (estimationRecord.calculated?.estimatedCost || 0) : 0);
  const estimatedMaterials = estimationRecord ? estimationRecord.calculated : null;

  // 2. Fetch actual direct site expenses
  const siteExpenses = await Expense.find({ siteId: site._id });
  const actualExpenseCost = Math.round(siteExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) * 100) / 100;

  // 3. Fetch actual materials consumed (via dispatches confirmed/dispatched/delivered)
  const dispatches = await Dispatch.find({ siteId: site._id, status: { $in: ['dispatched', 'delivered'] } });
  let actualMaterialCost = 0;

  for (const disp of dispatches) {
    if (!disp.items) continue;
    for (const item of disp.items) {
      if (!item.productId) continue;
      const pId = item.productId._id || item.productId;
      const product = await Product.findById(pId);
      if (!product) continue;

      // Find active BOM for the product
      let bom = await Bom.findOne({ productId: product._id, isActive: true });
      if (!bom) {
        bom = await Bom.findOne({ productId: product._id }).sort({ version: -1 });
      }
      if (!bom) {
        // Fallback: no BOM defined, use product costPrice/purchasePrice/sellingPrice
        const fallbackRate = product.costPrice || product.purchasePrice || 0;
        actualMaterialCost += (fallbackRate * (item.quantity || 0));
        continue;
      }

      // Sum raw material costs inside the BOM
      const bomItems = bom.items || [];
      for (const ingredient of bomItems) {
        if (!ingredient.materialId) continue;
        const mId = ingredient.materialId._id || ingredient.materialId;
        const material = await RawMaterial.findById(mId);
        if (!material) continue;

        // Cost = rate * quantity required per unit (with wastage) * dispatched product quantity
        const rate = material.purchaseRate || 0;
        const qtyPerUnit = (ingredient.quantityRequired || 0) * (1 + (ingredient.wastagePercent || 0) / 100);
        const totalIngredientQty = qtyPerUnit * (item.quantity || 0);
        actualMaterialCost += (rate * totalIngredientQty);
      }
    }
  }
  actualMaterialCost = Math.round(actualMaterialCost * 100) / 100;

  // 4. Fetch actual labor costs (via installation progress logs & site assigned labour)
  const installations = await Installation.find({ siteId: site._id });
  const activeLabour = await Labour.find({ status: 'active', branchId: site.branchId });
  const averageWage = site.labourRatePerManDay || (activeLabour.length > 0 
    ? activeLabour.reduce((sum, l) => sum + (l.dailyWages || 0), 0) / activeLabour.length 
    : 800); // standard fallback if no active labour in DB

  let actualLaborCost = 0;
  installations.forEach((inst) => {
    const workerCount = inst.labourCount || inst.teamSize || 0;
    actualLaborCost += (workerCount * averageWage);
  });

  if (actualLaborCost === 0) {
    const siteLabours = await Labour.find({ siteId: site._id });
    if (siteLabours.length > 0) {
      actualLaborCost = siteLabours.reduce((sum, l) => sum + (l.dailyWages || averageWage), 0);
    }
  }
  actualLaborCost = Math.round(actualLaborCost * 100) / 100;

  // 5. Fetch revenue share from quotation (accepted or latest created quotation)
  let siteRevenue = 0;
  let quotation = null;
  let quoteStatus = 'none';

  if (projectIdObj) {
    quotation = await Quotation.findOne({ projectId: projectIdObj, status: 'accepted' });
    if (quotation) {
      quoteStatus = 'accepted';
    } else {
      quotation = await Quotation.findOne({ projectId: projectIdObj }).sort({ createdAt: -1 });
      if (quotation) {
        quoteStatus = quotation.status || 'quoted';
      }
    }
  }

  if (quotation) {
    const projectSites = await Site.find({ projectId: projectIdObj });
    
    // Fetch target estimation costs for all sites to distribute revenue proportionally
    let totalTargetCost = 0;
    const siteTargetCosts = {};

    for (const ps of projectSites) {
      let est = await SiteCalculation.findOne({ siteId: ps._id }).sort({ createdAt: -1 });
      const cost = est ? (est.calculated?.estimatedCost || 0) : 0;
      siteTargetCosts[ps._id.toString()] = cost;
      totalTargetCost += cost;
    }

    if (totalTargetCost > 0) {
      const siteCost = siteTargetCosts[site._id.toString()] || 0;
      const proportion = siteCost / totalTargetCost;
      siteRevenue = quotation.grandTotal * proportion;
    } else {
      // Fallback to area-based distribution if no target costs calculated
      const totalArea = projectSites.reduce((sum, s) => sum + (s.siteArea || 0), 0);
      if (totalArea > 0) {
        const proportion = (site.siteArea || 0) / totalArea;
        siteRevenue = quotation.grandTotal * proportion;
      } else {
        siteRevenue = quotation.grandTotal;
      }
    }
  } else {
    // If no Quotation document exists yet, fallback to estimated target cost as provisional revenue
    if (estimatedCost > 0) {
      siteRevenue = estimatedCost;
      quoteStatus = 'estimated';
    }
  }
  siteRevenue = Math.round(siteRevenue * 100) / 100;

  // 6. Total costs & margins calculations
  const totalActualCost = Math.round((actualMaterialCost + actualLaborCost + actualExpenseCost) * 100) / 100;
  const profitAmount = Math.round((siteRevenue - totalActualCost) * 100) / 100;
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
    quoteStatus,
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

const calculateProjectCosting = async (projectId, branchFilter) => {
  const project = await Project.findById(projectId).populate('customerId', 'customerName companyName mobile');
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const sites = await Site.find({ projectId, ...branchFilter });

  let totalRevenue = 0;
  let estimatedTotalCost = 0;
  let actualMaterialCost = 0;
  let actualLaborCost = 0;
  let actualExpenseCost = 0;
  let totalActualCost = 0;
  let profitAmount = 0;

  const siteSummaries = [];

  for (const site of sites) {
    const siteCosting = await calculateSiteCosting(site._id, branchFilter);
    siteSummaries.push({
      siteId: site._id,
      siteName: site.siteName,
      siteArea: site.siteArea,
      status: site.status,
      revenue: siteCosting.revenue,
      estimatedCost: siteCosting.estimated.totalCost,
      actualCost: siteCosting.actual.totalCost,
      marginAmount: siteCosting.margin.amount,
      marginPercent: siteCosting.margin.percent,
    });

    totalRevenue += siteCosting.revenue;
    estimatedTotalCost += siteCosting.estimated.totalCost;
    actualMaterialCost += siteCosting.actual.materialCost;
    actualLaborCost += siteCosting.actual.laborCost;
    actualExpenseCost += siteCosting.actual.expenseCost;
    totalActualCost += siteCosting.actual.totalCost;
  }

  totalRevenue = Math.round(totalRevenue * 100) / 100;
  estimatedTotalCost = Math.round(estimatedTotalCost * 100) / 100;
  actualMaterialCost = Math.round(actualMaterialCost * 100) / 100;
  actualLaborCost = Math.round(actualLaborCost * 100) / 100;
  actualExpenseCost = Math.round(actualExpenseCost * 100) / 100;
  totalActualCost = Math.round(totalActualCost * 100) / 100;

  profitAmount = Math.round((totalRevenue - totalActualCost) * 100) / 100;
  const marginPercent = totalRevenue > 0 ? (profitAmount / totalRevenue) * 100 : 0;

  return {
    project: {
      projectId: project._id,
      projectName: project.projectName,
      customerName: project.customerId?.customerName,
      companyName: project.customerId?.companyName,
      status: project.status,
    },
    sites: siteSummaries,
    revenue: totalRevenue,
    estimated: {
      totalCost: estimatedTotalCost,
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
  calculateProjectCosting,
};
