const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const {
  createOrderSchema,
  updateStatusSchema,
  completeOrderSchema,
  updateOrderSchema,
  validate,
} = require('./validation');

router.use(protect);

router.get('/',                    branchScope, controller.list);
router.post('/',                   validate(createOrderSchema), controller.create);
router.post('/capacity-calculator', branchScope, controller.capacityCalculator);
router.get('/:id',                 branchScope, controller.getOne);
router.patch('/:id/status',        branchScope, validate(updateStatusSchema), controller.updateStatus);
router.post('/:id/complete',       branchScope, validate(completeOrderSchema), controller.complete);
router.put('/:id',                 branchScope, validate(updateOrderSchema), controller.update);

module.exports = router;
