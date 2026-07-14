const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createEquipmentSchema, updateEquipmentSchema, allocateSchema, validate } = require('./validation');

router.use(protect);

router.get('/',                 branchScope, controller.list);
router.post('/',                validate(createEquipmentSchema), controller.create);
router.put('/:id',              branchScope, validate(updateEquipmentSchema), controller.update);
router.patch('/:id/allocate',   branchScope, validate(allocateSchema), controller.allocate);
router.post('/:id/release',     branchScope, controller.release);
router.delete('/:id',           branchScope, controller.remove);

module.exports = router;
