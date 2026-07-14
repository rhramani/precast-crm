const ProductionOrder = require('../production/model');
const Branch = require('../branches/model');
const RawMaterial = require('../rawMaterials/model');
const FinishedGoodsInventory = require('../inventory/model');
const Customer = require('../customers/model');
const Project = require('../projects/model');
const Site = require('../sites/model');
const Invoice = require('../invoices/model');
const Payment = require('../payments/model');
const PurchaseOrder = require('../purchases/model');
const Expense = require('../expenses/model');
const Installation = require('../installation/model');
const Quotation = require('../quotations/model');
const BOM = require('../bom/model');
const Labour = require('../labour/model');

// 1. Production Report
const getProductionReport = async (branchFilter) => {
  const orders = await ProductionOrder.find(branchFilter);

  const totalOrders = orders.length;
  const totalPlanned = orders.reduce((sum, o) => sum + o.plannedQuantity, 0);
  const totalProduced = orders.reduce((sum, o) => sum + o.producedQuantity, 0);

  const statusCounts = { draft: 0, pending: 0, in_production: 0, completed: 0, cancelled: 0 };
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const efficiency = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

  return {
    summary: {
      totalOrders,
      totalPlanned,
      totalProduced,
      efficiencyPercent: efficiency,
    },
    statusBreakdown: statusCounts,
  };
};

// 2. Inventory Report
const getInventoryReport = async (branchFilter) => {
  const materials = await RawMaterial.find(branchFilter);
  const finishedGoods = await FinishedGoodsInventory.find(branchFilter).populate('productId', 'productName productCode');

  let rawStockValue = 0;
  let lowStockAlerts = 0;

  materials.forEach((m) => {
    rawStockValue += (m.currentQuantity * (m.purchaseRate || 0));
    if (m.currentQuantity <= m.minimumQuantity) {
      lowStockAlerts += 1;
    }
  });

  // Dynamically calculate finished goods valuation based on active BOMs
  const productIds = finishedGoods.map(fg => fg.productId?._id).filter(Boolean);
  const activeBoms = await BOM.find({ productId: { $in: productIds }, isActive: true });
  const bomCostMap = {};
  activeBoms.forEach((bom) => {
    bomCostMap[bom.productId.toString()] = bom.calculatedCost || 0;
  });

  const finishedStockValue = finishedGoods.reduce((sum, fg) => {
    const rate = fg.productId ? (bomCostMap[fg.productId._id.toString()] || 0) : 0;
    return sum + (fg.availableStock * rate);
  }, 0);

  return {
    rawMaterials: {
      totalItems: materials.length,
      valuation: rawStockValue,
      lowStockAlerts,
    },
    finishedGoods: {
      totalItems: finishedGoods.length,
      valuation: finishedStockValue,
      items: finishedGoods.map((fg) => {
        const rate = fg.productId ? (bomCostMap[fg.productId._id.toString()] || 0) : 0;
        return {
          productName: fg.productId?.productName || 'Product',
          productCode: fg.productId?.productCode || '',
          available: fg.availableStock,
          dispatchReady: fg.dispatchReadyStock,
          reserved: fg.reservedStock,
          unitCost: rate,
        };
      }),
    },
  };
};

// 3. Customer Reports
const getCustomerReport = async (branchFilter) => {
  const customers = await Customer.find(); // Customers are global, but we aggregate branch invoices/payments
  const result = [];

  for (const c of customers) {
    const [invoices, payments] = await Promise.all([
      Invoice.find({ customerId: c._id, ...branchFilter, status: { $ne: 'cancelled' } }),
      Payment.find({ customerId: c._id, ...branchFilter }),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const outstanding = totalInvoiced - totalPaid;

    if (totalInvoiced > 0 || totalPaid > 0) {
      result.push({
        customerId: c._id,
        customerName: c.customerName,
        companyName: c.companyName,
        totalInvoiced,
        totalPaid,
        outstanding,
      });
    }
  }

  return { customers: result };
};

// 4. Project Reports
const getProjectReport = async (branchFilter) => {
  const projectIds = await Site.find(branchFilter).distinct('projectId');
  const projects = await Project.find({ _id: { $in: projectIds } }).populate('customerId', 'customerName');

  const result = [];
  const statusCounts = { planned: 0, in_progress: 0, completed: 0, on_hold: 0 };

  for (const p of projects) {
    const sites = await Site.find({ projectId: p._id, ...branchFilter });

    let projectValuation = 0;
    const acceptedQuote = await Quotation.findOne({ projectId: p._id, status: 'accepted' });
    if (acceptedQuote) {
      projectValuation = acceptedQuote.grandTotal;
    }

    const siteStatus = { planned: 0, in_progress: 0, completed: 0, on_hold: 0 };
    sites.forEach((s) => {
      siteStatus[s.status] = (siteStatus[s.status] || 0) + 1;
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });

    result.push({
      projectId: p._id,
      projectName: p.projectName,
      customerName: p.customerId?.customerName || '—',
      sitesCount: sites.length,
      valuation: projectValuation,
      sitesBreakdown: siteStatus,
    });
  }

  return {
    projects: result,
    overallSitesBreakdown: statusCounts,
  };
};

// 5. Financial Reports
const getFinancialReport = async (branchFilter) => {
  const [invoices, payments, receivedPOs, expenses, installations] = await Promise.all([
    Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' } }),
    Payment.find(branchFilter),
    PurchaseOrder.find({ ...branchFilter, status: 'received' }),
    Expense.find(branchFilter),
    Installation.find(branchFilter),
  ]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalReceivedCash = payments.reduce((sum, pay) => sum + pay.amount, 0);

  const directExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const materialsPurchasesCost = receivedPOs.reduce((sum, po) => sum + po.grandTotal, 0);

  // estimate labour costs dynamically using average wage rate of active labour in the branch/system
  const activeLabours = await Labour.find({ status: 'active', ...branchFilter });
  const avgLabourWage = activeLabours.length > 0 
    ? activeLabours.reduce((sum, l) => sum + (l.dailyWages || 0), 0) / activeLabours.length 
    : 800; // standard fallback only if no active labour is registered in the database

  let labourCost = 0;
  installations.forEach((inst) => {
    labourCost += ((inst.labourCount || 0) * avgLabourWage);
  });

  const totalOperatingCosts = directExpenses + materialsPurchasesCost + labourCost;
  const netEarnings = totalInvoiced - totalOperatingCosts;

  return {
    revenue: {
      totalInvoiced,
      totalReceivedCash,
    },
    expenses: {
      materialsPurchasesCost,
      directExpenses,
      labourCost,
      totalOperatingCosts,
    },
    profitability: {
      netEarnings,
      marginPercent: totalInvoiced > 0 ? (netEarnings / totalInvoiced) * 100 : 0,
    },
  };
};

const getBranchPerformanceReport = async () => {
  const branches = await Branch.find();
  const performance = [];

  for (const b of branches) {
    const branchFilter = { branchId: b._id };

    // 1. Production
    const orders = await ProductionOrder.find(branchFilter);
    const totalProduced = orders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);

    // 2. Financials
    const [invoices, payments, receivedPOs, expenses, installations] = await Promise.all([
      Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' } }),
      Payment.find(branchFilter),
      PurchaseOrder.find({ ...branchFilter, status: 'received' }),
      Expense.find(branchFilter),
      Installation.find(branchFilter),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const directExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const materialsPurchasesCost = receivedPOs.reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const activeLabours = await Labour.find({ status: 'active', branchId: b._id });
    const avgLabourWage = activeLabours.length > 0 
      ? activeLabours.reduce((sum, l) => sum + (l.dailyWages || 0), 0) / activeLabours.length 
      : 800; // standard fallback only if no active labour is registered

    let labourCost = 0;
    installations.forEach((inst) => {
      labourCost += ((inst.labourCount || 0) * avgLabourWage);
    });

    const totalOperatingCosts = directExpenses + materialsPurchasesCost + labourCost;
    const netEarnings = totalInvoiced - totalOperatingCosts;
    const marginPercent = totalInvoiced > 0 ? (netEarnings / totalInvoiced) * 100 : 0;

    performance.push({
      branchId: b._id,
      branchName: b.branchName,
      branchCode: b.branchCode,
      status: b.status,
      totalProduced,
      revenue: totalInvoiced,
      operatingCosts: totalOperatingCosts,
      netProfit: netEarnings,
      marginPercent,
    });
  }

  return { performance };
};

module.exports = {
  getProductionReport,
  getInventoryReport,
  getCustomerReport,
  getProjectReport,
  getFinancialReport,
  getBranchPerformanceReport,
};
