const Joi = require('joi');

const templateProductSchema = Joi.object({
  productId: Joi.string().trim().required().messages({
    'any.required': 'Product ID is required for each product line',
    'string.empty': 'Product ID cannot be empty',
  }),
  qtyPerBay: Joi.number().positive().required().messages({
    'any.required': 'Quantity per bay is required',
    'number.positive': 'Quantity per bay must be greater than zero',
  }),
  unit: Joi.string().trim().default('pcs'),
  note: Joi.string().trim().allow('').default(''),
});

const templateMaterialSchema = Joi.object({
  materialId: Joi.string().trim().required().messages({
    'any.required': 'Material ID is required for each installation material line',
    'string.empty': 'Material ID cannot be empty',
  }),
  qty: Joi.number().min(0).required().messages({
    'any.required': 'Quantity is required',
    'number.min': 'Quantity must be non-negative',
  }),
  type: Joi.string().valid('per_pole', 'per_meter').default('per_pole'),
  note: Joi.string().trim().allow('').default(''),
});

const createTemplateSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Template name is required',
    'string.empty': 'Template name cannot be empty',
  }),
  // Accepts any category string — dynamically sourced from Product Master
  category: Joi.string().trim().required().messages({
    'any.required': 'Wall category is required',
    'string.empty': 'Category cannot be empty',
  }),
  description: Joi.string().trim().allow('').default(''),
  baySpacingMeters: Joi.number().min(0.1).default(3).messages({
    'number.min': 'Bay spacing must be at least 0.1 meter',
  }),
  products: Joi.array().items(templateProductSchema).default([]),
  installationMaterials: Joi.array().items(templateMaterialSchema).default([]),
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().trim(),
  category: Joi.string().trim(),
  description: Joi.string().trim().allow(''),
  baySpacingMeters: Joi.number().min(0.1),
  products: Joi.array().items(templateProductSchema),
  installationMaterials: Joi.array().items(templateMaterialSchema),
  isDefault: Joi.boolean(),
  isActive: Joi.boolean(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createTemplateSchema, updateTemplateSchema, validate };

