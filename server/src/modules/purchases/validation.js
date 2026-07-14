const Joi = require('joi');

// Supplier Validations
const createSupplierSchema = Joi.object({
  supplierName:  Joi.string().trim().required().messages({ 'any.required': 'Supplier name is required' }),
  contactPerson: Joi.string().trim().allow('', null),
  mobileNumber:  Joi.string().trim().required(),
  email:         Joi.string().email().allow('', null),
  address:       Joi.string().trim().allow('', null),
  gstNumber:     Joi.string().trim().uppercase().allow('', null),
  paymentTerms:  Joi.string().trim().allow('', null),
});

const updateSupplierSchema = Joi.object({
  supplierName:  Joi.string().trim(),
  contactPerson: Joi.string().trim().allow('', null),
  mobileNumber:  Joi.string().trim(),
  email:         Joi.string().email().allow('', null),
  address:       Joi.string().trim().allow('', null),
  gstNumber:     Joi.string().trim().uppercase().allow('', null),
  paymentTerms:  Joi.string().trim().allow('', null),
  status:        Joi.string().valid('active', 'inactive'),
});

// Purchase Order Validations
const poItemSchema = Joi.object({
  materialId:   Joi.string().trim().required(),
  quantity:     Joi.number().positive().required(),
  purchaseRate: Joi.number().min(0).required(),
});

const createPoSchema = Joi.object({
  supplierId:           Joi.string().trim().required().messages({ 'any.required': 'Supplier ID is required' }),
  poNumber:             Joi.string().trim().allow('', null),
  items:                Joi.array().items(poItemSchema).min(1).required().messages({
    'array.min': 'Purchase order must contain at least one item',
  }),
  expectedDeliveryDate: Joi.date().allow(null),
  branchId:             Joi.string().trim().allow('', null),
});

const updatePoSchema = Joi.object({
  items:                Joi.array().items(poItemSchema).min(1),
  expectedDeliveryDate: Joi.date().allow(null),
  status:               Joi.string().valid('draft', 'ordered', 'received', 'cancelled'),
});

const receivePoSchema = Joi.object({
  remarks: Joi.string().trim().allow('', null),
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
  createSupplierSchema,
  updateSupplierSchema,
  createPoSchema,
  updatePoSchema,
  receivePoSchema,
  validate,
};
