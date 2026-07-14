const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createDispatchSchema, updateDispatchSchema, validate } = require('./validation');

router.use(protect);

router.get('/',                 branchScope, controller.list);
router.post('/',                validate(createDispatchSchema), controller.create);
router.get('/:id',              branchScope, controller.getOne);
router.put('/:id',              branchScope, validate(updateDispatchSchema), controller.update);
router.post('/:id/dispatched',   branchScope, controller.markDispatched);
router.post('/:id/delivered',    branchScope, controller.markDelivered);

module.exports = router;
