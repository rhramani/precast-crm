const Joi = require('joi');

const createPaymentSchema = Joi.object({
  customerId:      Joi.string().trim().required().messages({ 'any.required': 'Customer reference is required' }),
  amount:          Joi.number().positive().required().messages({
    'number.positive': 'Payment amount must be greater than zero',
    'any.required': 'Payment amount is required',
  }),
  paymentMethod:   Joi.string().valid('cash', 'bank_transfer', 'cheque', 'other').default('bank_transfer'),
  paymentNumber:   Joi.string().trim().allow('', null),
  paymentDate:     Joi.date().default(() => new Date()),
  referenceNumber: Joi.string().trim().allow('', null, ''),
  remarks:         Joi.string().trim().allow('', null, ''),
  branchId:        Joi.string().trim().allow('', null),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createPaymentSchema, validate };
