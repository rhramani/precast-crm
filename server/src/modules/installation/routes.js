const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createInstallationSchema, updateInstallationSchema, statusSchema, validate } = require('./validation');

router.use(protect);

router.get('/',             branchScope, controller.list);
router.post('/',            validate(createInstallationSchema), controller.create);
router.get('/:id',          branchScope, controller.getOne);
router.put('/:id',          branchScope, validate(updateInstallationSchema), controller.update);
router.patch('/:id/status', branchScope, validate(statusSchema), controller.patchStatus);

module.exports = router;
