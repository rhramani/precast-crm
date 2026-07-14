const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createInvoiceSchema, updateInvoiceSchema, statusSchema, validate } = require('./validation');

router.use(protect);

router.get('/',             branchScope, controller.list);
router.post('/',            validate(createInvoiceSchema), controller.create);
router.get('/:id',          branchScope, controller.getOne);
router.put('/:id',          branchScope, validate(updateInvoiceSchema), controller.update);
router.patch('/:id/status', branchScope, validate(statusSchema), controller.cancel); // Status payload validates via statusSchema

module.exports = router;
