const expenseService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, siteId, projectId } = req.query;
  const result = await expenseService.listExpenses(req.branchFilter, { page, limit, search, siteId, projectId });
  res.json({ success: true, data: { expenses: result.expenses }, meta: result.meta });
};

const create = async (req, res) => {
  const branchId = req.user.role === 'super_admin'
    ? (req.body.branchId || req.user.branchId)
    : req.user.branchId;

  if (!branchId) {
    const err = new Error('Branch assignment is required to log expense');
    err.statusCode = 400;
    throw err;
  }

  const expense = await expenseService.createExpense(branchId, req.user.userId, req.body);
  res.status(201).json({ success: true, message: 'Expense logged successfully', data: { expense } });
};

const update = async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.id, req.branchFilter, req.body);
  res.json({ success: true, message: 'Expense log updated successfully', data: { expense } });
};

const remove = async (req, res) => {
  await expenseService.deleteExpense(req.params.id, req.branchFilter);
  res.json({ success: true, message: 'Expense logged deleted successfully' });
};

module.exports = {
  list,
  create,
  update,
  remove,
};
