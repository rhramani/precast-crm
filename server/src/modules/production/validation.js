const Joi = require('joi');

const createOrderSchema = Joi.object({
  productId:       Joi.string().trim().required().messages({ 'any.required': 'Product ID is required' }),
  plannedQuantity: Joi.number().integer().positive().required().messages({
    'number.positive': 'Planned quantity must be greater than zero',
  }),
  orderNumber:     Joi.string().trim().allow('', null),
  bomId:           Joi.string().trim().allow('', null),
  startDate:       Joi.date().allow(null),
  branchId:        Joi.string().trim().allow('', null),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'pending', 'in_production', 'completed', 'cancelled').required(),
});

const completeOrderSchema = Joi.object({
  producedQuantity: Joi.number().integer().min(0).required().messages({
    'number.min': 'Produced quantity cannot be negative',
  }),
  damagedQuantity: Joi.number().integer().min(0).allow('', null).messages({
    'number.min': 'Damaged quantity cannot be negative',
  }),
  remarks: Joi.string().trim().allow('', null),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = {
  createOrderSchema,
  updateStatusSchema,
  completeOrderSchema,
  validate,
};
