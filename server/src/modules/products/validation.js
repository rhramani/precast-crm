const Joi = require('joi');

const createProductSchema = Joi.object({
  productCode: Joi.string().trim().optional(),
  productName: Joi.string().trim().required(),
  category:    Joi.string()
    .valid(
      'cement_wall',
      'compound_wall',
      'boundary_wall',
      'pole',
      'beam',
      'top_beam',
      'slab',
      'paver_block',
      'column',
      'custom'
    )
    .required(),
  dimensions: Joi.object({
    width:     Joi.number().min(0).default(0),
    height:    Joi.number().min(0).default(0),
    length:    Joi.number().min(0).default(0),
    thickness: Joi.number().min(0).default(0),
  }).default(),
  weight:      Joi.number().min(0).default(0),
  unit:        Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null),
  branchId:    Joi.string().trim().allow('', null),
});

const updateProductSchema = Joi.object({
  productCode: Joi.string().trim(),
  productName: Joi.string().trim(),
  category:    Joi.string().valid(
    'cement_wall',
    'compound_wall',
    'boundary_wall',
    'pole',
    'beam',
    'top_beam',
    'slab',
    'paver_block',
    'column',
    'custom'
  ),
  dimensions: Joi.object({
    width:     Joi.number().min(0),
    height:    Joi.number().min(0),
    length:    Joi.number().min(0),
    thickness: Joi.number().min(0),
  }),
  weight:      Joi.number().min(0),
  unit:        Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  branchId:    Joi.string().trim().allow('', null),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createProductSchema, updateProductSchema, statusSchema, validate };
