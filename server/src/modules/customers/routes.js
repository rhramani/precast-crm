const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { protect } = require('../../middlewares/auth');
const { createCustomerSchema, updateCustomerSchema, validate } = require('./validation');

router.use(protect);

router.get('/',                 controller.list);
router.get('/distance',         controller.getDistance);
router.post('/',                validate(createCustomerSchema), controller.create);
router.get('/:id',              controller.getOne);
router.put('/:id',              validate(updateCustomerSchema), controller.update);
router.delete('/:id',           controller.remove);
router.get('/:id/ledger',        controller.ledger);
router.get('/:id/outstanding',   controller.outstanding);

module.exports = router;
