const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const {
  createSupplierSchema,
  updateSupplierSchema,
  createPoSchema,
  updatePoSchema,
  receivePoSchema,
  validate,
} = require('./validation');

router.use(protect);

// Suppliers
router.get('/suppliers',         controller.listSuppliers);
router.post('/suppliers',        validate(createSupplierSchema), controller.createSupplier);
router.put('/suppliers/:id',     validate(updateSupplierSchema), controller.updateSupplier);
router.delete('/suppliers/:id',  controller.deleteSupplier);


// Purchase Orders
router.get('/orders',            branchScope, controller.listOrders);
router.post('/orders',           validate(createPoSchema), controller.createOrder);
router.get('/orders/:id',        branchScope, controller.getOneOrder);
router.put('/orders/:id',        branchScope, validate(updatePoSchema), controller.updateOrder);
router.post('/orders/:id/receive', branchScope, validate(receivePoSchema), controller.receiveOrder);

module.exports = router;
