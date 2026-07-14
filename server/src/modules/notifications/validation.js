const Joi = require('joi');

const createNotificationSchema = Joi.object({
  title:    Joi.string().trim().required(),
  message:  Joi.string().trim().required(),
  type:     Joi.string().valid('low_stock', 'quote_accepted', 'payment_received', 'site_completed', 'alert').default('alert'),
  userId:   Joi.string().trim().allow(null, ''),
  branchId: Joi.string().trim().allow(null, ''),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createNotificationSchema, validate };
