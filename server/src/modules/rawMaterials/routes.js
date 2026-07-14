const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const {
  createMaterialSchema,
  updateMaterialSchema,
  stockInOutSchema,
  adjustmentSchema,
  transferSchema,
  validate,
} = require('./validation');

// All raw material routes require login
router.use(protect);

// Material listing & CRUD
router.get('/',                  branchScope, controller.list);
router.post('/',                 validate(createMaterialSchema), controller.create);
router.put('/:id',               branchScope, validate(updateMaterialSchema), controller.update);
router.delete('/:id',            branchScope, controller.remove);

// Low-stock queries
router.get('/low-stock',         branchScope, controller.lowStock);

// Stock manipulation and ledger history
router.post('/:id/stock-in',     branchScope, validate(stockInOutSchema), controller.stockIn);
router.post('/:id/stock-out',    branchScope, validate(stockInOutSchema), controller.stockOut);
router.post('/:id/adjustment',   branchScope, validate(adjustmentSchema), controller.adjust);
router.get('/:id/ledger',        branchScope, controller.ledger);

// Inter-branch transfers
router.post('/transfer',         validate(transferSchema), controller.transfer);

module.exports = router;
