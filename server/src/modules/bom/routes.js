const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createBomSchema, updateBomSchema, validate } = require('./validation');

router.use(protect);

router.post('/',                      validate(createBomSchema), controller.create);
router.get('/product/:productId',      branchScope, controller.getActive);
router.put('/:id',                    branchScope, validate(updateBomSchema), controller.update);
router.get('/:id/history',            branchScope, controller.history);
router.post('/:id/calculate-cost',    branchScope, controller.calculateCost);

// Helper route to calculate dynamic items cost before saving
router.post('/calculate-raw-cost',    controller.calculateRawItemsCost);

module.exports = router;
