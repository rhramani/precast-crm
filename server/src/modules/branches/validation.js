const Joi = require('joi');

const createBranchSchema = Joi.object({
  branchName:    Joi.string().trim().required().messages({ 'any.required': 'Branch Name is required' }),
  branchCode:    Joi.string().trim().uppercase().allow('', null).optional(),
  address:       Joi.string().trim().allow('', null),
  contactPerson: Joi.string().trim().allow('', null),
  mobileNumber:  Joi.string().trim().allow('', null),
  gstNumber:     Joi.string().trim().allow('', null),
  email:         Joi.string().email().lowercase().required().messages({
    'any.required': 'Email is required for branch login',
    'string.email': 'Must be a valid email address',
  }),
  password:      Joi.string().min(6).required().messages({
    'any.required': 'Password is required for branch login',
    'string.min': 'Password must be at least 6 characters',
  }),
});

const updateBranchSchema = Joi.object({
  branchName:    Joi.string().trim(),
  address:       Joi.string().trim().allow('', null),
  contactPerson: Joi.string().trim().allow('', null),
  mobileNumber:  Joi.string().trim().allow('', null),
  gstNumber:     Joi.string().trim().allow('', null),
  email:         Joi.string().email().lowercase(),
  password:      Joi.string().min(6).allow('', null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createBranchSchema, updateBranchSchema, statusSchema, validate };
