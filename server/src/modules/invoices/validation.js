const Joi = require('joi');

const invoiceItemSchema = Joi.object({
  productId:  Joi.string().trim().required(),
  quantity:   Joi.number().integer().positive().required(),
  rate:       Joi.number().min(0).required(),
  taxPercent: Joi.number().min(0).max(100).default(18),
});

const createInvoiceSchema = Joi.object({
  customerId:    Joi.string().trim().required().messages({ 'any.required': 'Customer reference is required' }),
  projectId:     Joi.string().trim().required().messages({ 'any.required': 'Project reference is required' }),
  invoiceNumber: Joi.string().trim().allow('', null),
  items:         Joi.array().items(invoiceItemSchema).min(1).required().messages({
    'array.min': 'Invoice must contain at least one item',
  }),
  invoiceDate:   Joi.date().default(() => new Date()),
  dueDate:       Joi.date().allow(null),
  branchId:      Joi.string().trim().allow('', null),
});

const updateInvoiceSchema = Joi.object({
  dueDate: Joi.date().allow(null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('unpaid', 'partially_paid', 'paid', 'cancelled').required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createInvoiceSchema, updateInvoiceSchema, statusSchema, validate };
