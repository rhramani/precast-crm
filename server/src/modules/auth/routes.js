const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { loginSchema, refreshTokenSchema, updateProfileSchema, validate } = require('./validation');

// Public
router.post('/login',           validate(loginSchema),        controller.login);
router.post('/refresh-token',   validate(refreshTokenSchema), controller.refreshToken);
router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password',  controller.resetPassword);

// Protected
router.post('/logout', protect, controller.logout);
router.get('/me',      protect, controller.getMe);
router.put('/profile', protect, validate(updateProfileSchema), controller.updateProfile);

module.exports = router;
