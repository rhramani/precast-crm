const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { branchScope } = require('../../middlewares/branchScope');
const { createLabourSchema, updateLabourSchema, batchAttendanceSchema, validate } = require('./validation');

router.use(protect);

router.get('/',                  branchScope, controller.list);
router.post('/',                 validate(createLabourSchema), controller.create);
router.put('/:id',               branchScope, validate(updateLabourSchema), controller.update);
router.post('/attendance',       validate(batchAttendanceSchema), controller.saveAttendance);
router.get('/attendance',        branchScope, controller.getAttendance);
router.delete('/:id',            branchScope, controller.remove);

module.exports = router;

