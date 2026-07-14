const Branch = require('./model');
const User = require('../auth/model');

const buildMeta = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });

// GET /branches
const listBranches = async ({ page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' }) => {
  const filter = {};
  
  if (search) {
    filter.$or = [
      { branchName: { $regex: search, $options: 'i' } },
      { branchCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [branches, total] = await Promise.all([
    Branch.find(filter, '-passwordHash -refreshToken').sort(sort).skip(skip).limit(limit),
    Branch.countDocuments(filter),
  ]);

  // Map to branch format for frontend compatibility
  const mappedBranches = branches.map(u => ({
    _id:           u._id,
    branchName:    u.branchName,
    branchCode:    u.branchCode,
    address:       u.address,
    contactPerson: u.contactPerson,
    mobileNumber:  u.mobileNumber,
    gstNumber:     u.gstNumber,
    email:         u.email,
    status:        u.status,
    subscription:  u.subscription,
    lastLogin:     u.lastLogin,
    createdAt:     u.createdAt,
    updatedAt:     u.updatedAt,
  }));

  return { branches: mappedBranches, meta: buildMeta(page, limit, total) };
};

// GET /branches/:id
const getBranchById = async (id) => {
  const u = await Branch.findById(id, '-passwordHash -refreshToken');
  if (!u) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    _id:           u._id,
    branchName:    u.branchName,
    branchCode:    u.branchCode,
    address:       u.address,
    contactPerson: u.contactPerson,
    mobileNumber:  u.mobileNumber,
    gstNumber:     u.gstNumber,
    email:         u.email,
    status:        u.status,
    subscription:  u.subscription,
    lastLogin:     u.lastLogin,
    createdAt:     u.createdAt,
    updatedAt:     u.updatedAt,
  };
};

// POST /branches
const createBranch = async (data) => {
  // Check duplicate email (across both users and branches)
  const existingEmailUser = await User.findOne({ email: data.email });
  const existingEmailBranch = await Branch.findOne({ email: data.email });
  if (existingEmailUser || existingEmailBranch) {
    const err = new Error('A user or branch with this email already exists');
    err.statusCode = 400;
    throw err;
  }

  // Auto-generate unique branchCode sequentially
  const lastBranch = await Branch.findOne().sort({ branchCode: -1 });
  let suffix = 1;
  if (lastBranch && lastBranch.branchCode) {
    const match = lastBranch.branchCode.match(/\d+$/);
    if (match) {
      suffix = parseInt(match[0], 10) + 1;
    }
  }
  const branchCode = `BR-${String(suffix).padStart(3, '0')}`;

  const u = await Branch.create({
    branchName:    data.branchName,
    email:         data.email,
    passwordHash:  data.password, // hashed by pre-save hook
    branchCode:    branchCode,
    address:       data.address,
    contactPerson: data.contactPerson,
    mobileNumber:  data.mobileNumber,
    gstNumber:     data.gstNumber,
    status:        'active',
  });

  return {
    _id:           u._id,
    branchName:    u.branchName,
    branchCode:    u.branchCode,
    address:       u.address,
    contactPerson: u.contactPerson,
    mobileNumber:  u.mobileNumber,
    gstNumber:     u.gstNumber,
    email:         u.email,
    status:        u.status,
  };
};

// PUT /branches/:id
const updateBranch = async (id, data) => {
  const u = await Branch.findById(id);
  if (!u) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }

  // Validate duplicate email
  if (data.email && data.email !== u.email) {
    const existingEmailUser = await User.findOne({ email: data.email });
    const existingEmailBranch = await Branch.findOne({ email: data.email });
    if (existingEmailUser || existingEmailBranch) {
      const err = new Error('A user or branch with this email already exists');
      err.statusCode = 400;
      throw err;
    }
    u.email = data.email;
  }

  if (data.branchName) u.branchName = data.branchName;
  if (data.address !== undefined) u.address = data.address;
  if (data.contactPerson !== undefined) u.contactPerson = data.contactPerson;
  if (data.mobileNumber !== undefined) u.mobileNumber = data.mobileNumber;
  if (data.gstNumber !== undefined) u.gstNumber = data.gstNumber;
  
  if (data.password) {
    u.passwordHash = data.password; // hashed on save
  }

  await u.save();

  return {
    _id:           u._id,
    branchName:    u.branchName,
    branchCode:    u.branchCode,
    address:       u.address,
    contactPerson: u.contactPerson,
    mobileNumber:  u.mobileNumber,
    gstNumber:     u.gstNumber,
    email:         u.email,
    status:        u.status,
  };
};

// PATCH /branches/:id/status
const updateBranchStatus = async (id, status) => {
  const u = await Branch.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!u) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    _id:        u._id,
    branchName: u.branchName,
    status:     u.status,
  };
};

// PATCH /branches/:id/subscription
const updateSubscription = async (id, data) => {
  const u = await Branch.findById(id);
  if (!u) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }

  u.subscription = {
    plan:       data.plan       || u.subscription?.plan       || 'trial',
    status:     data.status     || u.subscription?.status     || 'active',
    startDate:  data.startDate  || u.subscription?.startDate  || null,
    expiryDate: data.expiryDate || u.subscription?.expiryDate || null,
    maxUsers:   data.maxUsers   != null ? Number(data.maxUsers) : (u.subscription?.maxUsers ?? 5),
  };

  await u.save();

  return {
    _id:          u._id,
    branchName:   u.branchName,
    branchCode:   u.branchCode,
    status:       u.status,
    subscription: u.subscription,
  };
};

const deleteBranch = async (id) => {
  const u = await Branch.findByIdAndDelete(id);
  if (!u) {
    const err = new Error('Branch not found');
    err.statusCode = 404;
    throw err;
  }
  return { success: true };
};

module.exports = {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  updateBranchStatus,
  updateSubscription,
  deleteBranch,
};
