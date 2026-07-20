const Invoice = require('./model');
const Customer = require('../customers/model');
const Project = require('../projects/model');
const Quotation = require('../quotations/model');
const Payment = require('../payments/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

const calculateTotals = (items) => {
  let subTotal = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const totalAmount = item.quantity * item.rate;
    subTotal += totalAmount;
    taxAmount += totalAmount * ((item.taxPercent || 18) / 100);

    return {
      ...item,
      totalAmount,
    };
  });

  const grandTotal = subTotal + taxAmount;
  return { items: calculatedItems, subTotal, taxAmount, grandTotal };
};

// 1. List Invoices
const listInvoices = async (branchFilter, { page = 1, limit = 10, search, status, customerId }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.invoiceNumber = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }
  if (customerId) {
    filter.customerId = customerId;
  }

  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('customerId', 'customerName companyName mobile')
      .populate('projectId', 'projectName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Invoice.countDocuments(filter),
  ]);

  return { invoices, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Invoice
const createInvoice = async (branchId, userId, data) => {
  const customer = await Customer.findById(data.customerId);
  if (!customer) {
    const err = new Error('Customer mapping is invalid');
    err.statusCode = 404;
    throw err;
  }

  const project = await Project.findOne({ _id: data.projectId, customerId: data.customerId });
  if (!project) {
    const err = new Error('Project mapping is invalid or does not belong to selected customer');
    err.statusCode = 404;
    throw err;
  }

  // Auto-generate Invoice number sequentially
  const lastInvoice = await Invoice.findOne({ branchId }).sort({ invoiceNumber: -1 });
  let suffix = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const invoiceNumber = `INV-${String(suffix).padStart(5, '0')}`;

  const { items, subTotal, taxAmount, grandTotal } = calculateTotals(data.items);

  const invoice = await Invoice.create({
    branchId,
    customerId: data.customerId,
    projectId: data.projectId,
    invoiceNumber,
    items,
    subTotal,
    taxAmount,
    grandTotal,
    status: 'unpaid',
    invoiceDate: data.invoiceDate || new Date(),
    dueDate: data.dueDate || null,
    createdBy: userId,
  });

  return invoice;
};

const getInvoice = async (id, branchFilter) => {
  const invoice = await Invoice.findOne({ _id: id, ...branchFilter })
    .populate('customerId')
    .populate('projectId')
    .populate('items.productId', 'productName productCode unit');

  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  return invoice;
};

// 3. Update details
const updateInvoice = async (id, branchFilter, data) => {
  const invoice = await Invoice.findOne({ _id: id, ...branchFilter });
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (invoice.status === 'paid') {
    const err = new Error('Fully paid invoices cannot be modified');
    err.statusCode = 400;
    throw err;
  }

  if (data.dueDate) invoice.dueDate = data.dueDate;

  await invoice.save();
  return invoice;
};

// 4. Cancel Invoice
const cancelInvoice = async (id, branchFilter) => {
  const invoice = await Invoice.findOne({ _id: id, ...branchFilter });
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (invoice.paidAmount > 0) {
    const err = new Error('Invoices with payments registered cannot be cancelled');
    err.statusCode = 400;
    throw err;
  }

  invoice.status = 'cancelled';
  await invoice.save();
  return invoice;
};

// Helper: get all invoices for a customer (used by customer detail/ledger)
const getInvoicesByCustomer = async (customerId) => {
  const invoices = await Invoice.find({ customerId })
    .populate('projectId', 'projectName')
    .sort({ createdAt: -1 });
  return invoices;
};

// Helper: compute outstanding for a customer based on accepted quotations and direct payments
const getCustomerOutstandingData = async (customerId) => {
  const acceptedQuotations = await Quotation.find({ customerId, status: 'accepted' });
  let totalContractValue = acceptedQuotations.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  if (totalContractValue === 0) {
    const allInvoices = await Invoice.find({ customerId });
    totalContractValue = allInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  }

  const payments = await Payment.find({ customerId });
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const outstandingAmount = Math.max(0, totalContractValue - totalPaid);
  return { totalInvoiced: totalContractValue, totalPaid, outstandingAmount };
};

module.exports = {
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  cancelInvoice,
  getInvoicesByCustomer,
  getCustomerOutstandingData,
};
