const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createProjectSchema, updateProjectSchema, validate } = require('./validation');

router.use(protect);

router.get('/',               controller.list);
router.post('/',              validate(createProjectSchema), controller.create);
router.get('/:id',            controller.getOne);
router.put('/:id',            validate(updateProjectSchema), controller.update);
router.delete('/:id',         controller.remove);
router.get('/:id/sites',      branchScope, controller.getSites);
router.get('/:id/combined-requirements', branchScope, controller.getCombinedRequirements);

module.exports = router;
