const Joi = require('joi');

const templateProductSchema = Joi.object({
  productId: Joi.string().trim().required().messages({
    'any.required': 'Product ID is required for each product line',
    'string.empty': 'Product ID cannot be empty',
  }),
  qtyPerSqft: Joi.number().positive().required().messages({
    'any.required': 'Quantity per SQFT is required',
    'number.positive': 'Quantity per SQFT must be greater than zero',
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
  type: Joi.string().valid('per_pole', 'per_sqft', 'per_meter').default('per_pole'),
  note: Joi.string().trim().allow('').default(''),
});

const createTemplateSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Template name is required',
    'string.empty': 'Template name cannot be empty',
  }),
  productId: Joi.string().trim().allow('', null),
  productSqft: Joi.number().min(0).default(0),
  // Accepts any category string — dynamically sourced from Product Master
  category: Joi.string().trim().required().messages({
    'any.required': 'Wall category is required',
    'string.empty': 'Category cannot be empty',
  }),
  description: Joi.string().trim().allow('').default(''),
  heightFeet: Joi.number().min(0.1).default(6).messages({
    'number.min': 'Wall height must be at least 0.1 feet',
  }),
  products: Joi.array().items(templateProductSchema).default([]),
  installationMaterials: Joi.array().items(templateMaterialSchema).default([]),
  isDefault: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

const updateTemplateSchema = Joi.object({
  name: Joi.string().trim(),
  productId: Joi.string().trim().allow('', null),
  productSqft: Joi.number().min(0),
  category: Joi.string().trim(),
  description: Joi.string().trim().allow(''),
  heightFeet: Joi.number().min(0.1),
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

