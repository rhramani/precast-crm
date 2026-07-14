const Customer = require('./model');
const Project = require('../projects/model');
const { getInvoicesByCustomer, getCustomerOutstandingData } = require('../invoices/service');

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

  return { customers, meta: buildMeta(Number(page), Number(limit), total) };
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

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  getCustomer,
  getCustomerLedger,
  getCustomerOutstanding,
  deleteCustomer,
};
