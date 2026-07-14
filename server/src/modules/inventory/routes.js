const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');

router.use(protect, branchScope);

router.get('/raw-materials',  controller.getRawMaterials);
router.get('/wip',            controller.getWip);
router.get('/finished-goods', controller.getFinishedGoods);

module.exports = router;
