const User = require('../auth/model');

const buildMeta = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });

// GET /users
const listUsers = async ({ page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc', role, status, branchId }) => {
  const filter = {};
  if (search) filter.$or = [
    { name:  { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  if (role)     filter.role = role;
  if (status)   filter.status = status;
  if (branchId) filter.branchId = branchId;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('branchId', 'branchName branchCode')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(filter),
  ]);

  return { users: users.map((u) => u.toSafeObject()), meta: buildMeta(Number(page), Number(limit), total) };
};

// POST /users
const createUser = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  // passwordHash field is hashed by the pre-save hook
  const user = await User.create({
    name:        data.name,
    email:       data.email,
    mobile:      data.mobile || null,
    passwordHash: data.password, // Hook hashes this
    role:        data.role,
    branchId:    data.branchId || null,
    permissions: data.permissions || [],
  });

  return user.toSafeObject();
};

// PUT /users/:id
const updateUser = async (id, data) => {
  const user = await User.findById(id);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.name)             user.name = data.name;
  if (data.mobile !== undefined) user.mobile = data.mobile;
  if (data.role)             user.role = data.role;
  if ('branchId' in data)    user.branchId = data.branchId || null;
  if (data.permissions)      user.permissions = data.permissions;
  
  if (data.password) {
    user.passwordHash = data.password; // triggers pre-save hook
  }

  await user.save();
  return user.toSafeObject();
};

// PATCH /users/:id/status
const updateUserStatus = async (id, status) => {
  const user = await User.findByIdAndUpdate(id, { status }, { new: true });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user.toSafeObject();
};

module.exports = { listUsers, createUser, updateUser, updateUserStatus };
