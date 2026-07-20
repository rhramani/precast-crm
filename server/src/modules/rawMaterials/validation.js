const Joi = require('joi');

const createMaterialSchema = Joi.object({
  materialCode:    Joi.string().trim().allow('', null).optional(),
  materialName:    Joi.string().trim().required(),
  category:        Joi.string().trim().hex().length(24).required(),
  unit:            Joi.string().trim().required(),
  purchaseRate:    Joi.number().min(0).default(0),
  currentQuantity: Joi.number().min(0).default(0).optional(),
  branchId:        Joi.string().trim().allow(null, ''), // Injectable or required depending on controller/user
  supplierId:      Joi.string().trim().allow(null, '').optional(),
  date:            Joi.date().iso().optional().allow(null, ''),
});

const updateMaterialSchema = Joi.object({
  materialCode:    Joi.string().trim().allow('', null),
  materialName:    Joi.string().trim(),
  category:        Joi.string().trim().hex().length(24),
  unit:            Joi.string().trim(),
  purchaseRate:    Joi.number().min(0),
  branchId:        Joi.string().trim().allow(null, ''),
  supplierId:      Joi.string().trim().allow(null, '').optional(),
  date:            Joi.date().iso().optional().allow(null, ''),
});

const stockInOutSchema = Joi.object({
  quantity: Joi.number().positive().required().messages({
    'number.positive': 'Quantity must be greater than zero',
  }),
  remarks:  Joi.string().trim().allow('', null),
});

const adjustmentSchema = Joi.object({
  quantity: Joi.number().required().messages({
    'number.base': 'Quantity (signed delta value) is required',
  }),
  remarks:  Joi.string().trim().allow('', null),
});

const transferSchema = Joi.object({
  materialCode: Joi.string().trim().required().messages({
    'any.required': 'Material code is required to find/create matching material in target branch',
  }),
  fromBranchId: Joi.string().trim().required(),
  toBranchId:   Joi.string().trim().required(),
  quantity:     Joi.number().positive().required(),
  remarks:      Joi.string().trim().allow('', null),
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
  createMaterialSchema,
  updateMaterialSchema,
  stockInOutSchema,
  adjustmentSchema,
  transferSchema,
  validate,
};
