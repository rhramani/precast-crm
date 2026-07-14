const Quotation = require('./model');
const Customer = require('../customers/model');
const Project = require('../projects/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// Calculate quotation subTotal, taxAmount (18%), and grandTotal
const calculateTotals = (items) => {
  let subTotal = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const totalAmount = item.quantity * item.rate;
    const tax = totalAmount * ((item.taxPercent || 18) / 100);
    subTotal += totalAmount;
    taxAmount += tax;

    return {
      ...item,
      totalAmount,
    };
  });

  const grandTotal = subTotal + taxAmount;
  return { items: calculatedItems, subTotal, taxAmount, grandTotal };
};

// 1. List Quotations
const listQuotations = async (branchFilter, { page = 1, limit = 10, search, status }) => {
  const filter = { ...branchFilter };

  if (search) {
    filter.quoteNumber = { $regex: search, $options: 'i' };
  }
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [quotations, total] = await Promise.all([
    Quotation.find(filter)
      .populate('customerId', 'customerName companyName mobile')
      .populate('projectId', 'projectName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Quotation.countDocuments(filter),
  ]);

  return { quotations, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Quotation
const createQuotation = async (branchId, userId, data) => {
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

  // Auto-generate Quotation number sequentially
  const lastQuote = await Quotation.findOne({ branchId }).sort({ quoteNumber: -1 });
  let suffix = 1;
  if (lastQuote && lastQuote.quoteNumber) {
    const match = lastQuote.quoteNumber.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const quoteNumber = `QT-${String(suffix).padStart(5, '0')}`;

  const { items, subTotal, taxAmount, grandTotal } = calculateTotals(data.items);

  const quote = await Quotation.create({
    branchId,
    customerId: data.customerId,
    projectId: data.projectId,
    quoteNumber,
    items,
    subTotal,
    taxAmount,
    grandTotal,
    status: 'draft',
    validUntil: data.validUntil || null,
  });

  return quote;
};

// 3. Update Details
const updateQuotation = async (id, branchFilter, data) => {
  const quote = await Quotation.findOne({ _id: id, ...branchFilter });
  if (!quote) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }

  if (quote.status === 'accepted') {
    const err = new Error('Accepted quotations cannot be modified');
    err.statusCode = 400;
    throw err;
  }

  if (data.items) {
    const { items, subTotal, taxAmount, grandTotal } = calculateTotals(data.items);
    quote.items = items;
    quote.subTotal = subTotal;
    quote.taxAmount = taxAmount;
    quote.grandTotal = grandTotal;
  }

  if (data.validUntil) {
    quote.validUntil = data.validUntil;
  }

  await quote.save();
  return quote;
};

// 4. Update Status (with creditLimit validations)
const updateStatus = async (id, branchFilter, status, userId) => {
  const quote = await Quotation.findOne({ _id: id, ...branchFilter });
  if (!quote) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }

  // Credit limit validation checks
  if (status === 'accepted') {
    const customer = await Customer.findById(quote.customerId);
    if (customer && customer.creditLimit > 0 && quote.grandTotal > customer.creditLimit) {
      // Exceeded limit: log alert or throw error depending on configuration
      // We will allow the approval, but inject a warning indicator/message
      quote.remarks = `Warning: Approved quote of ₹${quote.grandTotal.toFixed(2)} exceeds customer credit limit of ₹${customer.creditLimit.toFixed(2)}.`;
    }
    quote.approvedBy = userId;
  }

  quote.status = status;
  await quote.save();

  if (status === 'accepted') {
    const { triggerNotification } = require('../notifications/service');
    await triggerNotification({
      branchId: quote.branchId,
      title: 'Quotation Approved',
      message: `Quotation '${quote.quoteNumber}' has been accepted for Project. Total: ₹${quote.grandTotal.toLocaleString()}`,
      type: 'quote_accepted',
    });
  }

  return quote;
};

const getQuotation = async (id, branchFilter) => {
  const quote = await Quotation.findOne({ _id: id, ...branchFilter })
    .populate('customerId')
    .populate('projectId')
    .populate('items.productId', 'productName productCode unit');

  if (!quote) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }

  return quote;
};

const deleteQuotation = async (id, branchFilter) => {
  const quote = await Quotation.findOneAndDelete({ _id: id, ...branchFilter });
  if (!quote) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

module.exports = {
  listQuotations,
  createQuotation,
  updateQuotation,
  updateStatus,
  getQuotation,
  deleteQuotation,
};
