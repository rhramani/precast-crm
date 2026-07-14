const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { roleCheck } = require('../../middlewares/roleCheck');
const { createUserSchema, updateUserSchema, statusSchema, validate } = require('./validation');

// All user management routes require Super Admin
router.use(protect, roleCheck('super_admin'));

router.get('/',              controller.list);
router.post('/',             validate(createUserSchema), controller.create);
router.put('/:id',           validate(updateUserSchema), controller.update);
router.patch('/:id/status',  validate(statusSchema),     controller.updateStatus);

module.exports = router;
