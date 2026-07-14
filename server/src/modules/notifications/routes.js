const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createNotificationSchema, validate } = require('./validation');

router.use(protect);

router.get('/',               branchScope, controller.list);
router.post('/',              validate(createNotificationSchema), controller.create);
router.patch('/read-all',     branchScope, controller.readAll);
router.patch('/:id/read',     branchScope, controller.read);

module.exports = router;
