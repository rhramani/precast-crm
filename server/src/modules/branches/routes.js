const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { roleCheck } = require('../../middlewares/roleCheck');
const { createBranchSchema, updateBranchSchema, statusSchema, validate } = require('./validation');

router.use(protect);

// Allow branch listing for authenticated users (required for dropdowns, Topbar switchers, etc.)
router.get('/', controller.list);

// Restrict branch management to Super Admin
router.get('/:id',          roleCheck('super_admin'), controller.getOne);
router.post('/',            roleCheck('super_admin'), validate(createBranchSchema), controller.create);
router.put('/:id',             roleCheck('super_admin'), validate(updateBranchSchema), controller.update);
router.patch('/:id/status',        roleCheck('super_admin'), validate(statusSchema), controller.updateStatus);
router.patch('/:id/subscription',  roleCheck('super_admin'), controller.updateSubscription);
router.delete('/:id',              roleCheck('super_admin'), controller.remove);

module.exports = router;
