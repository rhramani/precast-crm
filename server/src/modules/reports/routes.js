const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { roleCheck } = require('../../middlewares/roleCheck');
const { branchScope } = require('../../middlewares/branchScope');

router.use(protect);

router.get('/production',       branchScope, controller.production);
router.get('/inventory',        branchScope, controller.inventory);
router.get('/customer',         branchScope, controller.customer);
router.get('/project',          branchScope, controller.project);
router.get('/financial',        branchScope, controller.financial);
router.get('/branch-performance', roleCheck('super_admin'), controller.branchPerformance);
router.get('/dashboard-stats',  branchScope, controller.dashboardStats);

module.exports = router;
