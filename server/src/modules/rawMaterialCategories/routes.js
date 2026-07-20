const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const {
  createCategorySchema,
  updateCategorySchema,
  validate,
} = require('./validation');

router.use(protect);

router.get('/',       branchScope, controller.list);
router.post('/',      validate(createCategorySchema), controller.create);
router.put('/:id',    branchScope, validate(updateCategorySchema), controller.update);
router.delete('/:id', branchScope, controller.remove);

module.exports = router;
