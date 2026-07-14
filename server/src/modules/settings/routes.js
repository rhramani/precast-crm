const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { roleCheck } = require('../../middlewares/roleCheck');
const { updateSettingsSchema, validate } = require('./validation');

// GET settings is public (for login page/sidebar to load logo before auth)
router.get('/', controller.getSettings);

// PUT settings is restricted to super_admin
router.put('/', protect, roleCheck('super_admin'), validate(updateSettingsSchema), controller.updateSettings);

module.exports = router;
