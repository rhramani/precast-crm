const Joi = require('joi');

const installationItemSchema = Joi.object({
  productId: Joi.string().trim().required(),
  quantity:  Joi.number().integer().positive().required(),
});

const createInstallationSchema = Joi.object({
  projectId:      Joi.string().trim().required().messages({ 'any.required': 'Project reference is required' }),
  siteId:         Joi.string().trim().required().messages({ 'any.required': 'Site reference is required' }),
  installNumber:  Joi.string().trim().allow('', null),
  itemsInstalled: Joi.array().items(installationItemSchema).min(1).required().messages({
    'array.min': 'Installation must contain at least one item',
  }),
  teamSize:       Joi.number().integer().min(0).default(0),
  labourCount:    Joi.number().integer().min(0).default(0),
  branchId:       Joi.string().trim().allow('', null),
});

const updateInstallationSchema = Joi.object({
  itemsInstalled: Joi.array().items(installationItemSchema).min(1),
  teamSize:       Joi.number().integer().min(0),
  labourCount:    Joi.number().integer().min(0),
  status:         Joi.string().valid('planned', 'in_progress', 'completed'),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('planned', 'in_progress', 'completed').required(),
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
  createInstallationSchema,
  updateInstallationSchema,
  statusSchema,
  validate,
};
