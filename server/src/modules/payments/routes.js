const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createPaymentSchema, validate } = require('./validation');

router.use(protect);

router.get('/',        branchScope, controller.list);
router.post('/',       validate(createPaymentSchema), controller.create);
router.get('/:id',     branchScope, controller.getOne);

module.exports = router;
