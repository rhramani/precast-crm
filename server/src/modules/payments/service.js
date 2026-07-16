const mongoose = require('mongoose');
const Payment = require('./model');
const Invoice = require('../invoices/model');
const Customer = require('../customers/model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Payments
const listPayments = async (branchFilter, { page = 1, limit = 10, search, customerId }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.paymentNumber = { $regex: search, $options: 'i' };
  }
  if (customerId) {
    filter.customerId = customerId;
  }

  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('customerId', 'customerName companyName mobile')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  return { payments, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Payment & Allocate (CRITICAL TRANSACTION)
const createPayment = async (branchId, userId, data) => {
  const db = mongoose.connection;
  let session = null;

  try {
    session = await db.startSession();
  } catch (e) {
    session = null;
  }

  const executePayment = async (sess) => {
    const queryOpts = sess ? { session: sess } : {};

    const customer = await Customer.findById(data.customerId, null, queryOpts);
    if (!customer) {
      const err = new Error('Customer mapping is invalid');
      err.statusCode = 404;
      throw err;
    }

    const paymentNumber = data.paymentNumber || `PAY-${Date.now().toString().slice(-8)}`;

    // Uniqueness
    const conflict = await Payment.findOne({ branchId, paymentNumber }, null, queryOpts);
    if (conflict) {
      const err = new Error(`Payment voucher '${paymentNumber}' already exists`);
      err.statusCode = 409;
      throw err;
    }

    // Distribute payment to oldest unpaid invoices (FIFO)
    let amountToAllocate = Number(data.amount);

    const pendingInvoices = await Invoice.find({
      customerId: customer._id,
      status: { $in: ['unpaid', 'partially_paid'] },
    }, null, queryOpts).sort({ invoiceDate: 1 });

    for (const inv of pendingInvoices) {
      if (amountToAllocate <= 0) break;

      const remainingDue = inv.grandTotal - inv.paidAmount;

      if (remainingDue <= amountToAllocate) {
        inv.paidAmount = inv.grandTotal;
        inv.status = 'paid';
        amountToAllocate -= remainingDue;
      } else {
        inv.paidAmount += amountToAllocate;
        inv.status = 'partially_paid';
        amountToAllocate = 0;
      }

      await inv.save(queryOpts);
    }

    // Save payment details
    const payment = await Payment.create(
      [
        {
          branchId,
          customerId: customer._id,
          paymentNumber,
          paymentDate: data.paymentDate || new Date(),
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          referenceNumber: data.referenceNumber || '',
          remarks: data.remarks || '',
          createdBy: userId,
        },
      ],
      queryOpts
    );

    const { triggerNotification } = require('../notifications/service');
    await triggerNotification({
      branchId,
      title: 'Payment Received',
      message: `Received ₹${Number(data.amount).toLocaleString()} from customer '${customer.customerName}' (Voucher: ${paymentNumber})`,
      type: 'payment_received',
    });

    return payment[0];
  };

  if (session) {
    try {
      session.startTransaction();
      const result = await executePayment(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } else {
    return await executePayment(null);
  }
};

const getPayment = async (id, branchFilter) => {
  const payment = await Payment.findOne({ _id: id, ...branchFilter }).populate('customerId');
  if (!payment) {
    const err = new Error('Payment record not found');
    err.statusCode = 404;
    throw err;
  }
  return payment;
};

module.exports = {
  listPayments,
  createPayment,
  getPayment,
};
