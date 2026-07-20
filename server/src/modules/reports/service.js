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

const parseDateFilter = (dateFilter, customStart, customEnd) => {
  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (dateFilter === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateFilter === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate.setHours(23, 59, 59, 999);
  } else if (dateFilter === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
  } else if (dateFilter === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate.setHours(0, 0, 0, 0);
  } else if (dateFilter === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
    startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
};

// 1. Production Report
const getProductionReport = async (branchFilter, dateFilter, customStart, customEnd) => {
  const { startDate, endDate } = parseDateFilter(dateFilter, customStart, customEnd);
  
  const query = { ...branchFilter };
  if (startDate) {
    query.createdAt = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
  }

  const orders = await ProductionOrder.find(query);

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
    if (m.currentQuantity <= 0) {
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
const getCustomerReport = async (branchFilter, dateFilter, customStart, customEnd) => {
  const { startDate, endDate } = parseDateFilter(dateFilter, customStart, customEnd);
  
  const customerQuery = {};
  if (startDate) {
    customerQuery.createdAt = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
  }

  const customers = await Customer.find(customerQuery); // Customers are global, but we filter by creation date & aggregate branch invoices/payments
  const result = [];

  for (const c of customers) {
    const invoiceQuery = { customerId: c._id, ...branchFilter, status: { $ne: 'cancelled' } };
    const paymentQuery = { customerId: c._id, ...branchFilter };

    if (startDate) {
      invoiceQuery.invoiceDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
      paymentQuery.paymentDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    }

    const [invoices, payments] = await Promise.all([
      Invoice.find(invoiceQuery),
      Payment.find(paymentQuery),
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
const getProjectReport = async (branchFilter, dateFilter, customStart, customEnd) => {
  const { startDate, endDate } = parseDateFilter(dateFilter, customStart, customEnd);

  const projectIds = await Site.find(branchFilter).distinct('projectId');
  
  const projectQuery = { _id: { $in: projectIds } };
  if (startDate) {
    projectQuery.createdAt = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
  }

  const projects = await Project.find(projectQuery).populate('customerId', 'customerName');

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
const getFinancialReport = async (branchFilter, dateFilter, customStart, customEnd) => {
  const { startDate, endDate } = parseDateFilter(dateFilter, customStart, customEnd);

  const invoiceQuery = { ...branchFilter, status: { $ne: 'cancelled' } };
  const paymentQuery = { ...branchFilter };
  const poQuery = { ...branchFilter, status: 'received' };
  const expenseQuery = { ...branchFilter };
  const installationQuery = { ...branchFilter };

  if (startDate) {
    invoiceQuery.invoiceDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    paymentQuery.paymentDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    poQuery.receivedDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    expenseQuery.expenseDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    installationQuery.startDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
  }

  const [invoices, payments, receivedPOs, expenses, installations] = await Promise.all([
    Invoice.find(invoiceQuery),
    Payment.find(paymentQuery),
    PurchaseOrder.find(poQuery),
    Expense.find(expenseQuery),
    Installation.find(installationQuery),
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

const getBranchPerformanceReport = async (dateFilter, customStart, customEnd) => {
  const branches = await Branch.find();
  const performance = [];

  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (dateFilter === 'custom' && customStart && customEnd) {
    startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateFilter === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (dateFilter === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
  } else if (dateFilter === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (dateFilter === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  for (const b of branches) {
    const branchFilter = { branchId: b._id };

    // 1. Production
    const prodQuery = { ...branchFilter, status: 'completed' };
    if (startDate) prodQuery.completedDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
    const orders = await ProductionOrder.find(prodQuery);
    const totalProduced = orders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);

    // 2. Financials
    const invoiceQuery = { ...branchFilter, status: { $ne: 'cancelled' } };
    if (startDate) invoiceQuery.invoiceDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

    const expenseQuery = { ...branchFilter };
    if (startDate) expenseQuery.expenseDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

    const poQuery = { ...branchFilter, status: 'received' };
    if (startDate) poQuery.receivedDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

    const installationQuery = { ...branchFilter };
    if (startDate) installationQuery.startDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

    const [invoices, expenses, receivedPOs, installations] = await Promise.all([
      Invoice.find(invoiceQuery),
      Expense.find(expenseQuery),
      PurchaseOrder.find(poQuery),
      Installation.find(installationQuery),
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

const getDashboardStats = async (branchFilter, dateFilter, customStart, customEnd) => {
  const { startDate, endDate } = parseDateFilter(dateFilter, customStart, customEnd);

  // Find projectIds from sites matching branchFilter
  const projectIds = await Site.find(branchFilter).distinct('projectId');

  // Build the query for Project
  const projectQuery = { _id: { $in: projectIds } };
  if (startDate) {
    projectQuery.createdAt = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };
  }

  // 1. Compute high level KPIs based on selected date filter
  const prodQuery = { ...branchFilter, status: 'completed' };
  if (startDate) prodQuery.completedDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

  const allProdQuery = { ...branchFilter };
  if (startDate) allProdQuery.completedDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

  const invoiceQuery = { ...branchFilter, status: { $ne: 'cancelled' } };
  if (startDate) invoiceQuery.invoiceDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

  const expenseQuery = { ...branchFilter };
  if (startDate) expenseQuery.expenseDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

  const poQuery = { ...branchFilter, status: 'received' };
  if (startDate) poQuery.receivedDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

  const installationQuery = { ...branchFilter };
  if (startDate) installationQuery.startDate = endDate ? { $gte: startDate, $lte: endDate } : { $gte: startDate };

  const [completedOrders, allOrders, invoices, expenses, pos, installations, dashboardProjectsCount] = await Promise.all([
    ProductionOrder.find(prodQuery),
    ProductionOrder.find(allProdQuery),
    Invoice.find(invoiceQuery),
    Expense.find(expenseQuery),
    PurchaseOrder.find(poQuery),
    Installation.find(installationQuery),
    Project.countDocuments(projectQuery),
  ]);

  const totalProduced = completedOrders.reduce((sum, o) => sum + (o.producedQuantity || 0), 0);
  const totalPlanned = allOrders.reduce((sum, o) => sum + (o.plannedQuantity || 0), 0);
  const efficiencyPercent = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const directExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const materialsPurchasesCost = pos.reduce((sum, po) => sum + (po.grandTotal || 0), 0);

  const activeLabours = await Labour.find({ status: 'active', ...branchFilter });
  const avgLabourWage = activeLabours.length > 0 
    ? activeLabours.reduce((sum, l) => sum + (l.dailyWages || 0), 0) / activeLabours.length 
    : 800;

  let labourCost = 0;
  installations.forEach((inst) => {
    labourCost += ((inst.labourCount || 0) * avgLabourWage);
  });

  const totalOperatingCosts = directExpenses + materialsPurchasesCost + labourCost;
  const netProfit = totalRevenue - totalOperatingCosts;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  let avgLeadTime = 0;
  const completedWithLeadTime = completedOrders.filter(o => o.startDate && o.completedDate);
  if (completedWithLeadTime.length > 0) {
    const totalMs = completedWithLeadTime.reduce((sum, o) => sum + (new Date(o.completedDate) - new Date(o.startDate)), 0);
    avgLeadTime = totalMs / (1000 * 60 * 60 * 24 * completedWithLeadTime.length);
  }

  // 2. Compute dynamic chart data based on granularity of selected filter
  const chartData = [];

  if (dateFilter === 'custom' && startDate && endDate) {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      // Hourly granularity: 11 hourly slots from 08:00 to 18:00
      for (let h = 8; h <= 18; h++) {
        chartData.push({
          hour: h,
          label: `${h.toString().padStart(2, '0')}:00`,
          revenue: 0,
          expenses: 0,
          purchases: 0,
          production: 0,
          labourCost: 0,
          totalProduced: 0,
          totalPlanned: 0,
          projects: 0,
        });
      }

      const [customInvoices, customProd, customExpenses, customPos, customInstallations, customProjects] = await Promise.all([
        Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' }, invoiceDate: { $gte: startDate, $lte: endDate } }),
        ProductionOrder.find({ ...branchFilter, completedDate: { $gte: startDate, $lte: endDate } }),
        Expense.find({ ...branchFilter, expenseDate: { $gte: startDate, $lte: endDate } }),
        PurchaseOrder.find({ ...branchFilter, status: 'received', receivedDate: { $gte: startDate, $lte: endDate } }),
        Installation.find({ ...branchFilter, startDate: { $gte: startDate, $lte: endDate } }),
        Project.find({ _id: { $in: projectIds }, createdAt: { $gte: startDate, $lte: endDate } }),
      ]);

      const findHourSlot = (date) => {
        if (!date) return null;
        const hour = new Date(date).getHours();
        return chartData.find(slot => slot.hour === hour);
      };

      customInvoices.forEach(inv => {
        const slot = findHourSlot(inv.invoiceDate);
        if (slot) slot.revenue += (inv.grandTotal || 0);
      });

      customProd.forEach(po => {
        const slot = findHourSlot(po.completedDate);
        if (slot) {
          slot.totalProduced += (po.producedQuantity || 0);
          slot.totalPlanned += (po.plannedQuantity || 0);
        }
      });

      customExpenses.forEach(exp => {
        const slot = findHourSlot(exp.expenseDate);
        if (slot) slot.expenses += (exp.amount || 0);
      });

      customPos.forEach(po => {
        const slot = findHourSlot(po.receivedDate);
        if (slot) slot.purchases += (po.grandTotal || 0);
      });

      customInstallations.forEach(inst => {
        const slot = findHourSlot(inst.startDate);
        if (slot) {
          slot.labourCost += ((inst.labourCount || 0) * avgLabourWage);
        }
      });

      customProjects.forEach(proj => {
        const slot = findHourSlot(proj.createdAt);
        if (slot) slot.projects += 1;
      });

    } else if (diffDays <= 31) {
      // Daily granularity
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        chartData.push({
          dateString: d.toDateString(),
          label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          start: startOfDay,
          end: endOfDay,
          revenue: 0,
          expenses: 0,
          purchases: 0,
          production: 0,
          labourCost: 0,
          totalProduced: 0,
          totalPlanned: 0,
          projects: 0,
        });
      }

      const [customInvoices, customProd, customExpenses, customPos, customInstallations, customProjects] = await Promise.all([
        Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' }, invoiceDate: { $gte: startDate, $lte: endDate } }),
        ProductionOrder.find({ ...branchFilter, completedDate: { $gte: startDate, $lte: endDate } }),
        Expense.find({ ...branchFilter, expenseDate: { $gte: startDate, $lte: endDate } }),
        PurchaseOrder.find({ ...branchFilter, status: 'received', receivedDate: { $gte: startDate, $lte: endDate } }),
        Installation.find({ ...branchFilter, startDate: { $gte: startDate, $lte: endDate } }),
        Project.find({ _id: { $in: projectIds }, createdAt: { $gte: startDate, $lte: endDate } }),
      ]);

      const findDaySlot = (date) => {
        if (!date) return null;
        const dateStr = new Date(date).toDateString();
        return chartData.find(slot => slot.dateString === dateStr);
      };

      customInvoices.forEach(inv => {
        const slot = findDaySlot(inv.invoiceDate);
        if (slot) slot.revenue += (inv.grandTotal || 0);
      });

      customProd.forEach(po => {
        const slot = findDaySlot(po.completedDate);
        if (slot) {
          slot.totalProduced += (po.producedQuantity || 0);
          slot.totalPlanned += (po.plannedQuantity || 0);
        }
      });

      customExpenses.forEach(exp => {
        const slot = findDaySlot(exp.expenseDate);
        if (slot) slot.expenses += (exp.amount || 0);
      });

      customPos.forEach(po => {
        const slot = findDaySlot(po.receivedDate);
        if (slot) slot.purchases += (po.grandTotal || 0);
      });

      customInstallations.forEach(inst => {
        const slot = findDaySlot(inst.startDate);
        if (slot) {
          slot.labourCost += ((inst.labourCount || 0) * avgLabourWage);
        }
      });

      customProjects.forEach(proj => {
        const slot = findDaySlot(proj.createdAt);
        if (slot) slot.projects += 1;
      });

    } else {
      // Monthly granularity
      let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      while (cur <= endLimit) {
        const startOfMonth = new Date(cur.getFullYear(), cur.getMonth(), 1);
        const endOfMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);

        chartData.push({
          monthIndex: cur.getMonth(),
          year: cur.getFullYear(),
          label: `${monthNames[cur.getMonth()]} ${cur.getFullYear().toString().slice(-2)}`,
          start: startOfMonth,
          end: endOfMonth,
          revenue: 0,
          expenses: 0,
          purchases: 0,
          production: 0,
          labourCost: 0,
          totalProduced: 0,
          totalPlanned: 0,
          projects: 0,
        });

        cur.setMonth(cur.getMonth() + 1);
      }

      const [customInvoices, customProd, customExpenses, customPos, customInstallations, customProjects] = await Promise.all([
        Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' }, invoiceDate: { $gte: startDate, $lte: endDate } }),
        ProductionOrder.find({ ...branchFilter, completedDate: { $gte: startDate, $lte: endDate } }),
        Expense.find({ ...branchFilter, expenseDate: { $gte: startDate, $lte: endDate } }),
        PurchaseOrder.find({ ...branchFilter, status: 'received', receivedDate: { $gte: startDate, $lte: endDate } }),
        Installation.find({ ...branchFilter, startDate: { $gte: startDate, $lte: endDate } }),
        Project.find({ _id: { $in: projectIds }, createdAt: { $gte: startDate, $lte: endDate } }),
      ]);

      const findMonthSlot = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return chartData.find(m => m.monthIndex === d.getMonth() && m.year === d.getFullYear());
      };

      customInvoices.forEach(inv => {
        const slot = findMonthSlot(inv.invoiceDate);
        if (slot) slot.revenue += (inv.grandTotal || 0);
      });

      customProd.forEach(po => {
        const slot = findMonthSlot(po.completedDate);
        if (slot) {
          slot.totalProduced += (po.producedQuantity || 0);
          slot.totalPlanned += (po.plannedQuantity || 0);
        }
      });

      customExpenses.forEach(exp => {
        const slot = findMonthSlot(exp.expenseDate);
        if (slot) slot.expenses += (exp.amount || 0);
      });

      customPos.forEach(po => {
        const slot = findMonthSlot(po.receivedDate);
        if (slot) slot.purchases += (po.grandTotal || 0);
      });

      customInstallations.forEach(inst => {
        const slot = findMonthSlot(inst.startDate);
        if (slot) {
          slot.labourCost += ((inst.labourCount || 0) * avgLabourWage);
        }
      });

      customProjects.forEach(proj => {
        const slot = findMonthSlot(proj.createdAt);
        if (slot) slot.projects += 1;
      });
    }
  } else if (dateFilter === 'today') {
    // Hourly granularity: 11 hourly slots from 08:00 to 18:00
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    for (let h = 8; h <= 18; h++) {
      chartData.push({
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
        revenue: 0,
        expenses: 0,
        purchases: 0,
        production: 0,
        labourCost: 0,
        totalProduced: 0,
        totalPlanned: 0,
        projects: 0,
      });
    }

    const [hourlyInvoices, hourlyProd, hourlyExpenses, hourlyPos, hourlyInstallations, hourlyProjects] = await Promise.all([
      Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' }, invoiceDate: { $gte: startOfToday, $lte: endOfToday } }),
      ProductionOrder.find({ ...branchFilter, completedDate: { $gte: startOfToday, $lte: endOfToday } }),
      Expense.find({ ...branchFilter, expenseDate: { $gte: startOfToday, $lte: endOfToday } }),
      PurchaseOrder.find({ ...branchFilter, status: 'received', receivedDate: { $gte: startOfToday, $lte: endOfToday } }),
      Installation.find({ ...branchFilter, startDate: { $gte: startOfToday, $lte: endOfToday } }),
      Project.find({ _id: { $in: projectIds }, createdAt: { $gte: startOfToday, $lte: endOfToday } }),
    ]);

    const findHourSlot = (date) => {
      if (!date) return null;
      const hour = new Date(date).getHours();
      return chartData.find(slot => slot.hour === hour);
    };

    hourlyInvoices.forEach(inv => {
      const slot = findHourSlot(inv.invoiceDate);
      if (slot) slot.revenue += (inv.grandTotal || 0);
    });

    hourlyProd.forEach(po => {
      const slot = findHourSlot(po.completedDate);
      if (slot) {
        slot.totalProduced += (po.producedQuantity || 0);
        slot.totalPlanned += (po.plannedQuantity || 0);
      }
    });

    hourlyExpenses.forEach(exp => {
      const slot = findHourSlot(exp.expenseDate);
      if (slot) slot.expenses += (exp.amount || 0);
    });

    hourlyPos.forEach(po => {
      const slot = findHourSlot(po.receivedDate);
      if (slot) slot.purchases += (po.grandTotal || 0);
    });

    hourlyInstallations.forEach(inst => {
      const slot = findHourSlot(inst.startDate);
      if (slot) {
        slot.labourCost += ((inst.labourCount || 0) * avgLabourWage);
      }
    });

    hourlyProjects.forEach(proj => {
      const slot = findHourSlot(proj.createdAt);
      if (slot) slot.projects += 1;
    });

  } else if (dateFilter === 'week' || dateFilter === 'month') {
    // Daily granularity: last 7 days or last 30 days
    const numDays = dateFilter === 'week' ? 7 : 30;

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      chartData.push({
        dateString: d.toDateString(),
        label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        start: startOfDay,
        end: endOfDay,
        revenue: 0,
        expenses: 0,
        purchases: 0,
        production: 0,
        labourCost: 0,
        totalProduced: 0,
        totalPlanned: 0,
        projects: 0,
      });
    }

    const startWindow = chartData[0].start;
    const endWindow = chartData[chartData.length - 1].end;

    const [dailyInvoices, dailyProd, dailyExpenses, dailyPos, dailyInstallations, dailyProjects] = await Promise.all([
      Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' }, invoiceDate: { $gte: startWindow, $lte: endWindow } }),
      ProductionOrder.find({ ...branchFilter, completedDate: { $gte: startWindow, $lte: endWindow } }),
      Expense.find({ ...branchFilter, expenseDate: { $gte: startWindow, $lte: endWindow } }),
      PurchaseOrder.find({ ...branchFilter, status: 'received', receivedDate: { $gte: startWindow, $lte: endWindow } }),
      Installation.find({ ...branchFilter, startDate: { $gte: startWindow, $lte: endWindow } }),
      Project.find({ _id: { $in: projectIds }, createdAt: { $gte: startWindow, $lte: endWindow } }),
    ]);

    const findDaySlot = (date) => {
      if (!date) return null;
      const dateStr = new Date(date).toDateString();
      return chartData.find(slot => slot.dateString === dateStr);
    };

    dailyInvoices.forEach(inv => {
      const slot = findDaySlot(inv.invoiceDate);
      if (slot) slot.revenue += (inv.grandTotal || 0);
    });

    dailyProd.forEach(po => {
      const slot = findDaySlot(po.completedDate);
      if (slot) {
        slot.totalProduced += (po.producedQuantity || 0);
        slot.totalPlanned += (po.plannedQuantity || 0);
      }
    });

    dailyExpenses.forEach(exp => {
      const slot = findDaySlot(exp.expenseDate);
      if (slot) slot.expenses += (exp.amount || 0);
    });

    dailyPos.forEach(po => {
      const slot = findDaySlot(po.receivedDate);
      if (slot) slot.purchases += (po.grandTotal || 0);
    });

    dailyInstallations.forEach(inst => {
      const slot = findDaySlot(inst.startDate);
      if (slot) {
        slot.labourCost += ((inst.labourCount || 0) * avgLabourWage);
      }
    });

    dailyProjects.forEach(proj => {
      const slot = findDaySlot(proj.createdAt);
      if (slot) slot.projects += 1;
    });

  } else {
    // Monthly granularity: last 12 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      chartData.push({
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        start: startOfMonth,
        end: endOfMonth,
        revenue: 0,
        expenses: 0,
        purchases: 0,
        production: 0,
        labourCost: 0,
        totalProduced: 0,
        totalPlanned: 0,
        projects: 0,
      });
    }

    const startWindow = chartData[0].start;
    const endWindow = chartData[11].end;

    const [monthlyInvoices, monthlyProd, monthlyExpenses, monthlyPos, monthlyInstallations, monthlyProjects] = await Promise.all([
      Invoice.find({ ...branchFilter, status: { $ne: 'cancelled' }, invoiceDate: { $gte: startWindow, $lte: endWindow } }),
      ProductionOrder.find({ ...branchFilter, completedDate: { $gte: startWindow, $lte: endWindow } }),
      Expense.find({ ...branchFilter, expenseDate: { $gte: startWindow, $lte: endWindow } }),
      PurchaseOrder.find({ ...branchFilter, status: 'received', receivedDate: { $gte: startWindow, $lte: endWindow } }),
      Installation.find({ ...branchFilter, startDate: { $gte: startWindow, $lte: endWindow } }),
      Project.find({ _id: { $in: projectIds }, createdAt: { $gte: startWindow, $lte: endWindow } }),
    ]);

    const findMonthSlot = (date) => {
      if (!date) return null;
      const d = new Date(date);
      return chartData.find(m => m.monthIndex === d.getMonth() && m.year === d.getFullYear());
    };

    monthlyInvoices.forEach(inv => {
      const slot = findMonthSlot(inv.invoiceDate);
      if (slot) slot.revenue += (inv.grandTotal || 0);
    });

    monthlyProd.forEach(po => {
      const slot = findMonthSlot(po.completedDate);
      if (slot) {
        slot.totalProduced += (po.producedQuantity || 0);
        slot.totalPlanned += (po.plannedQuantity || 0);
      }
    });

    monthlyExpenses.forEach(exp => {
      const slot = findMonthSlot(exp.expenseDate);
      if (slot) slot.expenses += (exp.amount || 0);
    });

    monthlyPos.forEach(po => {
      const slot = findMonthSlot(po.receivedDate);
      if (slot) slot.purchases += (po.grandTotal || 0);
    });

    monthlyInstallations.forEach(inst => {
      const slot = findMonthSlot(inst.startDate);
      if (slot) {
        slot.labourCost += ((inst.labourCount || 0) * avgLabourWage);
      }
    });

    monthlyProjects.forEach(proj => {
      const slot = findMonthSlot(proj.createdAt);
      if (slot) slot.projects += 1;
    });
  }

  // Common mapping/post-processing
  chartData.forEach(slot => {
    slot.totalOperatingCosts = slot.expenses + slot.purchases + slot.labourCost;
    slot.profit = slot.revenue - slot.totalOperatingCosts;
    slot.efficiency = slot.totalPlanned > 0 ? (slot.totalProduced / slot.totalPlanned) * 100 : 0;
  });

  return {
    kpi: {
      totalProduced,
      avgLeadTime,
      totalRevenue,
      efficiencyPercent,
      totalExpenses: totalOperatingCosts,
      netProfit,
      marginPercent,
      activeProjects: dashboardProjectsCount,
      materialsPurchasesCost,
    },
    chartData: chartData.map(slot => ({
      label: slot.label,
      revenue: slot.revenue,
      expenses: slot.totalOperatingCosts,
      purchases: slot.purchases,
      production: slot.totalProduced,
      projects: slot.projects,
      efficiency: slot.efficiency,
      profit: slot.profit,
    })),
  };
};

module.exports = {
  getProductionReport,
  getInventoryReport,
  getCustomerReport,
  getProjectReport,
  getFinancialReport,
  getBranchPerformanceReport,
  getDashboardStats,
};
