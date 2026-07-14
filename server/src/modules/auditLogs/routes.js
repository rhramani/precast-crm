const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');

router.use(protect);

router.get('/', controller.list);

module.exports = router;
