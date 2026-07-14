const Joi = require('joi');

const createCustomerSchema = Joi.object({
  customerName:  Joi.string().trim().required().messages({ 'any.required': 'Customer name is required' }),
  companyName:   Joi.string().trim().allow('', null),
  contactPerson: Joi.string().trim().allow('', null),
  mobile:        Joi.string().trim().required(),
  email:         Joi.string().email().allow('', null),
  gstNumber:     Joi.string().trim().uppercase().allow('', null),
  address:       Joi.string().trim().allow('', null),
  creditLimit:   Joi.number().min(0).default(0),
  paymentTerms:  Joi.string().trim().allow('', null),
});

const updateCustomerSchema = Joi.object({
  customerName:  Joi.string().trim(),
  companyName:   Joi.string().trim().allow('', null),
  contactPerson: Joi.string().trim().allow('', null),
  mobile:        Joi.string().trim(),
  email:         Joi.string().email().allow('', null),
  gstNumber:     Joi.string().trim().uppercase().allow('', null),
  address:       Joi.string().trim().allow('', null),
  creditLimit:   Joi.number().min(0),
  paymentTerms:  Joi.string().trim().allow('', null),
  status:        Joi.string().valid('active', 'inactive'),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createCustomerSchema, updateCustomerSchema, validate };
