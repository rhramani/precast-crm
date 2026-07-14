const Joi = require('joi');

const dispatchItemSchema = Joi.object({
  productId: Joi.string().trim().required(),
  quantity:  Joi.number().integer().positive().required(),
});

const createDispatchSchema = Joi.object({
  projectId:        Joi.string().trim().required().messages({ 'any.required': 'Project reference is required' }),
  siteId:           Joi.string().trim().required().messages({ 'any.required': 'Site reference is required' }),
  dispatchNumber:   Joi.string().trim().allow('', null),
  items:            Joi.array().items(dispatchItemSchema).min(1).required().messages({
    'array.min': 'Dispatch must contain at least one item',
  }),
  transportDetails: Joi.object({
    vehicleNumber: Joi.string().trim().allow('', null),
    driverName:    Joi.string().trim().allow('', null),
    contactNumber: Joi.string().trim().allow('', null),
    helperName:    Joi.string().trim().allow('', null),
  }).default(),
  branchId:         Joi.string().trim().allow('', null),
});

const updateDispatchSchema = Joi.object({
  items:            Joi.array().items(dispatchItemSchema).min(1),
  transportDetails: Joi.object({
    vehicleNumber: Joi.string().trim().allow('', null),
    driverName:    Joi.string().trim().allow('', null),
    contactNumber: Joi.string().trim().allow('', null),
    helperName:    Joi.string().trim().allow('', null),
  }),
  status:           Joi.string().valid('draft', 'dispatched', 'delivered'),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createDispatchSchema, updateDispatchSchema, validate };
