const jwt = require('jsonwebtoken');
const User = require('./model');
const Branch = require('../branches/model');
const { sendResetOtpEmail } = require('../../utils/mail');

/**
 * Generate access + refresh token pair.
 * JWT payload carries userId, role, branchId as specified in design doc §4.2.
 */
const generateTokens = (user, isBranch = false) => {
  const payload = {
    userId:   user._id,
    role:     isBranch ? 'branch' : user.role,
    branchId: isBranch ? user._id : (user.branchId || null),
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
};

// ────────────────────────────────────────────────────────────
// login
// ────────────────────────────────────────────────────────────
const login = async (email, password) => {
  // Select passwordHash explicitly (select: false on schema)
  let user = await User.findOne({ email }).select('+passwordHash').populate('branchId', 'branchName branchCode status');
  let isBranch = false;

  if (!user) {
    user = await Branch.findOne({ email }).select('+passwordHash');
    isBranch = true;
  }

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (user.status === 'inactive') {
    const err = new Error('Account is inactive. Contact your administrator.');
    err.statusCode = 403;
    throw err;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const { accessToken, refreshToken } = generateTokens(user, isBranch);

  // Persist refresh token on document
  if (isBranch) {
    await Branch.updateOne(
      { _id: user._id },
      { $set: { refreshToken, lastLogin: new Date() } }
    );
  } else {
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken, lastLogin: new Date() } }
    );
  }

  return { user: user.toSafeObject(), accessToken, refreshToken };
};

// ────────────────────────────────────────────────────────────
// refreshToken
// ────────────────────────────────────────────────────────────
const refreshToken = async (token) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  let user = await User.findById(decoded.userId).select('+refreshToken');
  let isBranch = false;

  if (!user) {
    user = await Branch.findById(decoded.userId).select('+refreshToken');
    isBranch = true;
  }

  if (!user || user.refreshToken !== token) {
    const err = new Error('Refresh token mismatch');
    err.statusCode = 401;
    throw err;
  }

  const tokens = generateTokens(user, isBranch);
  if (isBranch) {
    await Branch.updateOne(
      { _id: user._id },
      { $set: { refreshToken: tokens.refreshToken } }
    );
  } else {
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken: tokens.refreshToken } }
    );
  }

  return tokens;
};

// ────────────────────────────────────────────────────────────
// logout
// ────────────────────────────────────────────────────────────
const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null }, { validateBeforeSave: false });
  await Branch.findByIdAndUpdate(userId, { refreshToken: null }, { validateBeforeSave: false });
};

// ────────────────────────────────────────────────────────────
// me  (get current user from token)
// ────────────────────────────────────────────────────────────
const getMe = async (userId) => {
  let user = await User.findById(userId).populate('branchId', 'branchName branchCode status');
  if (!user) {
    user = await Branch.findById(userId);
  }
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user.toSafeObject();
};

// ────────────────────────────────────────────────────────────
// updateProfile
// ────────────────────────────────────────────────────────────
const updateProfile = async (userId, data) => {
  let user = await User.findById(userId);
  let isBranch = false;

  if (!user) {
    user = await Branch.findById(userId);
    isBranch = true;
  }

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  // Validate duplicate email
  if (data.email && data.email !== user.email) {
    const existingEmailUser = await User.findOne({ email: data.email });
    const existingEmailBranch = await Branch.findOne({ email: data.email });
    if (existingEmailUser || existingEmailBranch) {
      const err = new Error('A user with this email already exists');
      err.statusCode = 400;
      throw err;
    }
    user.email = data.email;
  }

  if (isBranch) {
    if (data.branchName) user.branchName = data.branchName;
    if (data.name) user.branchName = data.name;
  } else {
    if (data.name) user.name = data.name;
  }
  if (data.mobile !== undefined) user.mobile = data.mobile;
  if (data.mobileNumber !== undefined) user.mobileNumber = data.mobileNumber;
  if (data.address !== undefined) user.address = data.address;
  if (data.gstNumber !== undefined) user.gstNumber = data.gstNumber;
  if (data.contactPerson !== undefined) user.contactPerson = data.contactPerson;

  if (data.password) {
    user.passwordHash = data.password; // hashed on save
  }

  await user.save();
  return user.toSafeObject();
};

const forgotPassword = async (email) => {
  let account = await User.findOne({ email });
  let isBranch = false;

  if (!account) {
    account = await Branch.findOne({ email });
    isBranch = true;
  }

  if (!account) {
    const err = new Error('No user or branch found with this email address');
    err.statusCode = 404;
    throw err;
  }

  // Generate 6-digit random code
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set expiry to 10 minutes from now
  account.resetPasswordOtp = otpCode;
  account.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  
  await account.save();

  console.log(`[Forgot Password] Reset code for ${email} is ${otpCode}`);
  await sendResetOtpEmail(email, otpCode);

  return {
    email,
    otpCode,
    message: 'Verification OTP generated successfully.',
  };
};

const resetPassword = async (email, otp, newPassword) => {
  let account = await User.findOne({ email });
  let isBranch = false;

  if (!account) {
    account = await Branch.findOne({ email });
    isBranch = true;
  }

  if (!account) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (!account.resetPasswordOtp || account.resetPasswordOtp !== otp) {
    const err = new Error('Invalid OTP verification code');
    err.statusCode = 400;
    throw err;
  }

  if (new Date() > account.resetPasswordExpires) {
    const err = new Error('Verification OTP code has expired');
    err.statusCode = 400;
    throw err;
  }

  // OTP verified, update password
  account.passwordHash = newPassword;
  account.resetPasswordOtp = null;
  account.resetPasswordExpires = null;

  await account.save();

  return {
    success: true,
    message: 'Password has been reset successfully.',
  };
};

module.exports = { login, refreshToken, logout, getMe, updateProfile, forgotPassword, resetPassword };
