const Joi = require('joi');

const bomItemSchema = Joi.object({
  materialId:       Joi.string().trim().required().messages({ 'any.required': 'Material ID is required' }),
  quantityRequired: Joi.number().positive().required(),
  unit:             Joi.string().trim().required(),
  wastagePercent:   Joi.number().min(0).max(100).default(0),
});

const createBomSchema = Joi.object({
  productId: Joi.string().trim().required().messages({ 'any.required': 'Product ID is required for a BOM' }),
  items:     Joi.array().items(bomItemSchema).min(1).required().messages({
    'array.min': 'BOM must contain at least one raw material item',
  }),
  isActive: Joi.boolean().default(true),
});

const updateBomSchema = Joi.object({
  items: Joi.array().items(bomItemSchema).min(1),
  isActive: Joi.boolean(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createBomSchema, updateBomSchema, validate };
