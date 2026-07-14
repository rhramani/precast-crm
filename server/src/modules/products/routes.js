const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createProductSchema, updateProductSchema, statusSchema, validate } = require('./validation');

router.use(protect);

router.get('/',                 branchScope, controller.list);
router.post('/',                validate(createProductSchema), controller.create);
router.put('/:id',              branchScope, validate(updateProductSchema), controller.update);
router.patch('/:id/status',     branchScope, validate(statusSchema), controller.updateStatus);
router.delete('/:id',           branchScope, controller.remove);

module.exports = router;
