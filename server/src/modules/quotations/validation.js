const Joi = require('joi');

const quoteItemSchema = Joi.object({
  productId:  Joi.string().trim().required(),
  quantity:   Joi.number().positive().required(),
  rate:       Joi.number().min(0).required(),
  taxPercent: Joi.number().min(0).max(100).default(18),
});

const createQuotationSchema = Joi.object({
  customerId:  Joi.string().trim().required().messages({ 'any.required': 'Customer reference is required' }),
  projectId:   Joi.string().trim().required().messages({ 'any.required': 'Project reference is required' }),
  quoteNumber: Joi.string().trim().allow('', null),
  items:       Joi.array().items(quoteItemSchema).min(1).required().messages({
    'array.min': 'Quotation must contain at least one item',
  }),
  validUntil:  Joi.date().allow(null),
  branchId:    Joi.string().trim().allow('', null),
});

const updateQuotationSchema = Joi.object({
  items:      Joi.array().items(quoteItemSchema).min(1),
  validUntil: Joi.date().allow(null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected').required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createQuotationSchema, updateQuotationSchema, statusSchema, validate };
