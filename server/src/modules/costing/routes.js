const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');

router.use(protect);

router.get('/:siteId', branchScope, controller.getSiteCosting);
router.get('/project/:projectId', branchScope, controller.getProjectCosting);

module.exports = router;
