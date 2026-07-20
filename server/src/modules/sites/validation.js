const Joi = require('joi');

const createSiteSchema = Joi.object({
  projectId:     Joi.string().trim().required().messages({ 'any.required': 'Project reference is required' }),
  siteName:      Joi.string().trim().required().messages({ 'any.required': 'Site name is required' }),
  siteAddress:   Joi.string().trim().allow('', null),
  siteEngineer:  Joi.string().trim().allow('', null),
  contactNumber: Joi.string().trim().allow('', null),
  startDate:     Joi.date().allow(null),
  endDate:       Joi.date().allow(null),
  siteArea:      Joi.number().min(0).default(0),
  branchId:      Joi.string().trim().allow('', null),
  wallTemplateId: Joi.string().trim().allow('', null),
  transportRatePerTrip: Joi.number().min(0).default(0),
  labourRatePerManDay: Joi.number().min(0).default(0),
  panelSellingPrice: Joi.number().min(0).default(0),
  poleSellingPrice: Joi.number().min(0).default(0),
  beamSellingPrice: Joi.number().min(0).default(0),
  topBeamSellingPrice: Joi.number().min(0).default(0),
  cementRate: Joi.number().min(0).default(0),
  steelRate: Joi.number().min(0).default(0),
  aggregateRate: Joi.number().min(0).default(0),
});

const updateSiteSchema = Joi.object({
  siteName:      Joi.string().trim(),
  siteAddress:   Joi.string().trim().allow('', null),
  siteEngineer:  Joi.string().trim().allow('', null),
  contactNumber: Joi.string().trim().allow('', null),
  startDate:     Joi.date().allow(null),
  endDate:       Joi.date().allow(null),
  siteArea:      Joi.number().min(0),
  status:        Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold'),
  branchId:      Joi.string().trim().allow('', null),
  wallTemplateId: Joi.string().trim().allow('', null),
  transportRatePerTrip: Joi.number().min(0),
  labourRatePerManDay: Joi.number().min(0),
  panelSellingPrice: Joi.number().min(0),
  poleSellingPrice: Joi.number().min(0),
  beamSellingPrice: Joi.number().min(0),
  topBeamSellingPrice: Joi.number().min(0),
  cementRate: Joi.number().min(0),
  steelRate: Joi.number().min(0),
  aggregateRate: Joi.number().min(0),
});

const statusSchema = Joi.object({
  status: Joi.string().valid('planned', 'in_progress', 'completed', 'on_hold').required(),
});

const calculateSchema = Joi.object({
  siteArea: Joi.number().positive().required().messages({
    'number.positive': 'Site area (linear length) must be greater than zero',
  }),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createSiteSchema, updateSiteSchema, statusSchema, calculateSchema, validate };
