const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null),
  branchId: Joi.string().trim().allow('', null),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  branchId: Joi.string().trim().allow('', null),
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
  createCategorySchema,
  updateCategorySchema,
  validate,
};
