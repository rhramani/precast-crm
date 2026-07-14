const Expense = require('./model');

const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit),
});

// 1. List Expenses
const listExpenses = async (branchFilter, { page = 1, limit = 10, search }) => {
  const filter = { ...branchFilter };
  if (search) {
    filter.description = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate('projectId', 'projectName')
      .populate('siteId', 'siteName siteAddress')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Expense.countDocuments(filter),
  ]);

  return { expenses, meta: buildMeta(Number(page), Number(limit), total) };
};

// 2. Create Expense
const createExpense = async (branchId, userId, data) => {
  const expense = await Expense.create({
    ...data,
    branchId,
    createdBy: userId,
  });

  return expense;
};

// 3. Update details
const updateExpense = async (id, branchFilter, data) => {
  const expense = await Expense.findOneAndUpdate({ _id: id, ...branchFilter }, data, { new: true, runValidators: true });
  if (!expense) {
    const err = new Error('Expense record not found');
    err.statusCode = 404;
    throw err;
  }
  return expense;
};

const deleteExpense = async (id, branchFilter) => {
  const expense = await Expense.findOneAndDelete({ _id: id, ...branchFilter });
  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
