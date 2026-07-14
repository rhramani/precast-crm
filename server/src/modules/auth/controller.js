const authService = require('./service');

// POST /auth/login
const login = async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login(email, password);
  res.json({
    success: true,
    message: 'Login successful',
    data,
  });
};

// POST /auth/refresh-token
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;
  const tokens = await authService.refreshToken(token);
  res.json({
    success: true,
    message: 'Token refreshed',
    data: tokens,
  });
};

// POST /auth/logout
const logout = async (req, res) => {
  if (req.user) {
    await authService.logout(req.user.userId);
  }
  res.json({ success: true, message: 'Logged out successfully' });
};

// GET /auth/me
const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.userId);
  res.json({ success: true, data: { user } });
};

// PUT /auth/profile
const updateProfile = async (req, res) => {
  const user = await authService.updateProfile(req.user.userId, req.body);
  res.json({ success: true, message: 'Profile updated successfully', data: { user } });
};

// POST /auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.json({
    success: true,
    message: 'OTP verification code sent successfully',
    data: result,
  });
};

// POST /auth/reset-password
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.resetPassword(email, otp, newPassword);
  res.json(result);
};

module.exports = { login, refreshToken, logout, getMe, updateProfile, forgotPassword, resetPassword };
