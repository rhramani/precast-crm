const userService = require('./service');

const list = async (req, res) => {
  const { page, limit, search, sortBy, sortOrder, role, status, branchId } = req.query;
  const result = await userService.listUsers({ page, limit, search, sortBy, sortOrder, role, status, branchId });
  res.json({ success: true, data: { users: result.users }, meta: result.meta });
};

const create = async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({ success: true, message: 'User created', data: { user } });
};

const update = async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json({ success: true, message: 'User updated', data: { user } });
};

const updateStatus = async (req, res) => {
  const user = await userService.updateUserStatus(req.params.id, req.body.status);
  res.json({ success: true, message: `User ${req.body.status}`, data: { user } });
};

module.exports = { list, create, update, updateStatus };
