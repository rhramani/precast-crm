const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createSiteSchema, updateSiteSchema, statusSchema, calculateSchema, validate } = require('./validation');

router.use(protect);

router.post('/',                          branchScope, validate(createSiteSchema), controller.create);
router.put('/:id',                        branchScope, validate(updateSiteSchema), controller.update);
router.patch('/:id/status',               branchScope, validate(statusSchema), controller.updateStatus);
router.get('/:id',                        branchScope, controller.getOne);
router.get('/:id/dispatch-requirements',   branchScope, controller.getDispatchRequirements);
router.post('/:id/requirement-calculator', branchScope, validate(calculateSchema), controller.calculate);
router.delete('/:id',                     branchScope, controller.remove);

module.exports = router;

