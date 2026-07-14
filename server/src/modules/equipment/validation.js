const Joi = require('joi');

const createEquipmentSchema = Joi.object({
  name: Joi.string().trim().required(),
  type: Joi.string().valid('crane', 'jcb', 'vehicle', 'other').required(),
  ratePerDay: Joi.number().min(0).default(0),
  status: Joi.string().valid('available', 'allocated', 'maintenance').default('available'),
  allocatedTo: Joi.string().trim().allow(null, '').optional(),
  branchId: Joi.string().trim().allow(null, '').optional(),
});

const updateEquipmentSchema = Joi.object({
  name: Joi.string().trim(),
  type: Joi.string().valid('crane', 'jcb', 'vehicle', 'other'),
  ratePerDay: Joi.number().min(0),
  status: Joi.string().valid('available', 'allocated', 'maintenance'),
  allocatedTo: Joi.string().trim().allow(null, ''),
  branchId: Joi.string().trim().allow(null, ''),
});

const allocateSchema = Joi.object({
  siteId: Joi.string().trim().allow(null, '').required(),
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
  createEquipmentSchema,
  updateEquipmentSchema,
  allocateSchema,
  validate,
};
