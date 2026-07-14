const Joi = require('joi');

const createProjectSchema = Joi.object({
  customerId:  Joi.string().trim().required().messages({ 'any.required': 'Customer mapping is required' }),
  projectName: Joi.string().trim().required().messages({ 'any.required': 'Project name is required' }),
  description: Joi.string().trim().allow('', null),
  status:      Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold').default('planned'),
});

const updateProjectSchema = Joi.object({
  projectName: Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  status:      Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold'),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createProjectSchema, updateProjectSchema, validate };
