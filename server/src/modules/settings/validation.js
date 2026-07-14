const Joi = require('joi');

const updateSettingsSchema = Joi.object({
  companyName: Joi.string().trim().max(100).allow('', null).messages({
    'string.max': 'Company name cannot exceed 100 characters',
  }),
  logo: Joi.string().allow('', null), // base64 string
  favicon: Joi.string().allow('', null), // base64 string
  fontFamily: Joi.string().valid('Inter', 'Roboto', 'Public Sans').default('Inter'),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { updateSettingsSchema, validate };
