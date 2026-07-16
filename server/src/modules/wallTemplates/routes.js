const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createTemplateSchema, updateTemplateSchema, validate } = require('./validation');

router.use(protect);

// CRUD
router.get('/',                          branchScope, controller.list);
router.post('/',                         branchScope, validate(createTemplateSchema), controller.create);
router.get('/:id',                       branchScope, controller.getOne);
router.put('/:id',                       branchScope, validate(updateTemplateSchema), controller.update);
router.delete('/:id',                    branchScope, controller.remove);

// Set a template as the default for its category
router.patch('/:id/set-default',         branchScope, controller.setDefault);

// Calculate product quantities for a given wall length using this template
router.post('/:id/calculate',            branchScope, controller.calculate);

module.exports = router;
