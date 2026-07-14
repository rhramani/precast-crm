const Joi = require('joi');

const loginSchema = Joi.object({
  email:    Joi.string().email().required().messages({ 'string.email': 'Valid email is required' }),
  password: Joi.string().min(6).required().messages({ 'string.min': 'Password must be at least 6 characters' }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name:          Joi.string().trim().allow('', null),
  email:         Joi.string().email().allow('', null),
  mobile:        Joi.string().trim().allow('', null),
  mobileNumber:  Joi.string().trim().allow('', null),
  address:       Joi.string().trim().allow('', null),
  gstNumber:     Joi.string().trim().allow('', null),
  contactPerson: Joi.string().trim().allow('', null),
  password:      Joi.string().min(6).allow('', null),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { loginSchema, refreshTokenSchema, updateProfileSchema, validate };
