const Joi = require('joi');

const createProductSchema = Joi.object({
  productCode: Joi.string().trim().optional(),
  productName: Joi.string().trim().required(),
  category:    Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  dimensions: Joi.object({
    width:     Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()).default(''),
    height:    Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()).default(''),
    length:    Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()).default(''),
    thickness: Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()).default(''),
  }).default(),
  weight:      Joi.number().min(0).default(0),
  unit:        Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null),
  branchId:    Joi.string().trim().allow('', null),
  makingCharge: Joi.number().min(0).default(0),
  sellingPrice: Joi.number().min(0).default(0),
});

const updateProductSchema = Joi.object({
  productCode: Joi.string().trim(),
  productName: Joi.string().trim(),
  category:    Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  dimensions: Joi.object({
    width:     Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()),
    height:    Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()),
    length:    Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()),
    thickness: Joi.alternatives().try(Joi.string().trim().allow(''), Joi.number()),
  }),
  weight:      Joi.number().min(0),
  unit:        Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  branchId:    Joi.string().trim().allow('', null),
  makingCharge: Joi.number().min(0),
  sellingPrice: Joi.number().min(0),
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
