const Customer = require('./model');
const Project = require('../projects/model');
const Site = require('../sites/model');
const Quotation = require('../quotations/model');
const Invoice = require('../invoices/model');
const Payment = require('../payments/model');
const { getInvoicesByCustomer, getCustomerOutstandingData } = require('../invoices/service');
const DistanceCache = require('./distanceCacheModel');
const { getDrivingDistance } = require('../../utils/distance');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const listCustomers = async ({ page = 1, limit = 10, search, status }) => {
  const filter = {};
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { companyName:  { $regex: search, $options: 'i' } },
      { email:        { $regex: search, $options: 'i' } },
    ];
  }
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(filter),
  ]);

  const customerIds = customers.map((c) => c._id);

  // Bulk query all associated collections in parallel
  const [quotations, invoices, payments, projects] = await Promise.all([
    Quotation.find({ customerId: { $in: customerIds }, status: 'accepted' }),
    Invoice.find({ customerId: { $in: customerIds } }),
    Payment.find({ customerId: { $in: customerIds } }),
    Project.find({ customerId: { $in: customerIds } }),
  ]);

  const projectIds = projects.map((p) => p._id);
  const sites = await Site.find({ projectId: { $in: projectIds } }).populate('branchId', 'branchName address');

  // Map collections by customerId for O(1) in-memory lookup
  const quotationsByCustomer = {};
  const invoicesByCustomer = {};
  const paymentsByCustomer = {};
  const projectsByCustomer = {};
  const sitesByProject = {};

  customerIds.forEach((id) => {
    const idStr = id.toString();
    quotationsByCustomer[idStr] = [];
    invoicesByCustomer[idStr] = [];
    paymentsByCustomer[idStr] = [];
    projectsByCustomer[idStr] = [];
  });

  quotations.forEach((q) => {
    const cId = q.customerId?.toString();
    if (quotationsByCustomer[cId]) quotationsByCustomer[cId].push(q);
  });

  invoices.forEach((inv) => {
    const cId = inv.customerId?.toString();
    if (invoicesByCustomer[cId]) invoicesByCustomer[cId].push(inv);
  });

  payments.forEach((p) => {
    const cId = p.customerId?.toString();
    if (paymentsByCustomer[cId]) paymentsByCustomer[cId].push(p);
  });

  projects.forEach((proj) => {
    const cId = proj.customerId?.toString();
    if (projectsByCustomer[cId]) projectsByCustomer[cId].push(proj);
  });

  projectIds.forEach((pId) => {
    sitesByProject[pId.toString()] = [];
  });

  sites.forEach((s) => {
    const pId = s.projectId?.toString();
    if (sitesByProject[pId]) sitesByProject[pId].push(s);
  });

  const customersWithPending = customers.map((c) => {
    const idStr = c._id.toString();

    // Calculate outstanding info matching the logic of getCustomerOutstandingData
    const custQuotations = quotationsByCustomer[idStr] || [];
    let totalContractValue = custQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    if (totalContractValue === 0) {
      const custInvoices = invoicesByCustomer[idStr] || [];
      totalContractValue = custInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    }

    const custPayments = paymentsByCustomer[idStr] || [];
    const totalPaid = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstandingAmount = Math.max(0, totalContractValue - totalPaid);

    // Get all sites for projects of this customer
    const custProjects = projectsByCustomer[idStr] || [];
    const sitesList = [];
    custProjects.forEach((proj) => {
      const projSites = sitesByProject[proj._id.toString()] || [];
      sitesList.push(...projSites);
    });

    return {
      ...c.toObject(),
      outstandingAmount,
      totalInvoiced: totalContractValue,
      totalPaid,
      hasPendingPayment: outstandingAmount > 0,
      sitesList,
    };
  });

  return { customers: customersWithPending, meta: buildMeta(Number(page), Number(limit), total) };
};

const createCustomer = async (data) => {
  const customer = await Customer.create(data);
  return customer;
};

const updateCustomer = async (id, data) => {
  const customer = await Customer.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customer;
};

const getCustomer = async (id) => {
  const customer = await Customer.findById(id);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return customer;
};

// GET /customers/:id/ledger — pulls real invoice data
const getCustomerLedger = async (id) => {
  await getCustomer(id);
  const invoices = await getInvoicesByCustomer(id);
  const { totalInvoiced, totalPaid, outstandingAmount } = await getCustomerOutstandingData(id);

  const transactions = invoices.map((inv) => ({
    _id: inv._id,
    invoiceNumber: inv.invoiceNumber,
    projectName: inv.projectId?.projectName || '—',
    date: inv.invoiceDate,
    grandTotal: inv.grandTotal,
    paidAmount: inv.paidAmount,
    balance: inv.grandTotal - inv.paidAmount,
    status: inv.status,
    dueDate: inv.dueDate,
  }));

  return {
    transactions,
    summary: { totalInvoiced, totalPaid, outstandingAmount },
  };
};

// GET /customers/:id/outstanding — real outstanding balance
const getCustomerOutstanding = async (id) => {
  const customer = await getCustomer(id);
  const { totalInvoiced, totalPaid, outstandingAmount } = await getCustomerOutstandingData(id);
  const projects = await Project.find({ customerId: id });

  return {
    customerId: customer._id,
    customerName: customer.customerName,
    outstandingAmount,
    totalInvoiced,
    totalPaid,
    creditLimit: customer.creditLimit,
    creditUsedPercent: customer.creditLimit > 0
      ? Math.min(100, Math.round((outstandingAmount / customer.creditLimit) * 100))
      : 0,
    projectCount: projects.length,
  };
};

const deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

const getDistanceBetweenAddresses = async (origin, destination) => {
  if (!origin || !destination) {
    const err = new Error('Origin and destination addresses are required');
    err.statusCode = 400;
    throw err;
  }

  const cleanOrigin = origin.trim();
  const cleanDestination = destination.trim();

  // 1. Check database cache
  const cached = await DistanceCache.findOne({ origin: cleanOrigin, destination: cleanDestination });
  if (cached) {
    return cached.distanceKm;
  }

  // 2. Fetch driving distance from external APIs
  const distanceKm = await getDrivingDistance(cleanOrigin, cleanDestination);
  if (distanceKm === null || distanceKm === undefined) {
    const err = new Error('Could not calculate distance between addresses');
    err.statusCode = 422;
    throw err;
  }

  // 3. Cache the successful result
  await DistanceCache.create({
    origin: cleanOrigin,
    destination: cleanDestination,
    distanceKm,
  }).catch((err) => {
    // Suppress duplicate key error in case of concurrent requests
    if (err.code !== 11000) {
      console.error('DistanceCache write failed:', err);
    }
  });

  return distanceKm;
};

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  getCustomer,
  getCustomerLedger,
  getCustomerOutstanding,
  deleteCustomer,
  getDistanceBetweenAddresses,
};
