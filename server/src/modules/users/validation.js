const Joi = require('joi');

const createUserSchema = Joi.object({
  name:        Joi.string().trim().required(),
  email:       Joi.string().email().required(),
  mobile:      Joi.string().trim().allow('', null),
  password:    Joi.string().min(6).required(),
  role:        Joi.string().valid('super_admin', 'branch').required(),
  branchId:    Joi.string().allow(null, ''),
  permissions: Joi.array().items(Joi.string()).default([]),
});

const updateUserSchema = Joi.object({
  name:        Joi.string().trim(),
  mobile:      Joi.string().trim().allow('', null),
  role:        Joi.string().valid('super_admin', 'branch'),
  branchId:    Joi.string().allow(null, ''),
  permissions: Joi.array().items(Joi.string()),
  password:    Joi.string().min(6), // Optional — only to reset password
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

module.exports = { createUserSchema, updateUserSchema, statusSchema, validate };
