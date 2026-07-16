const Joi = require('joi');

const createLabourSchema = Joi.object({
  labourName:   Joi.string().trim().required().messages({ 'any.required': 'Labour name is required' }),
  mobileNumber: Joi.string().trim().required(),
  labourType:   Joi.string().valid('mason', 'bar_bender', 'carpenter', 'helper', 'operator', 'supervisor').default('helper'),
  dailyWages:   Joi.number().min(0).required().messages({ 'any.required': 'Daily wage rate is required' }),
  branchId:     Joi.string().trim().allow('', null),
  projectId:    Joi.string().trim().allow('', null),
  siteId:       Joi.string().trim().allow('', null),
});

const updateLabourSchema = Joi.object({
  labourName:   Joi.string().trim(),
  mobileNumber: Joi.string().trim(),
  labourType:   Joi.string().valid('mason', 'bar_bender', 'carpenter', 'helper', 'operator', 'supervisor'),
  dailyWages:   Joi.number().min(0),
  status:       Joi.string().valid('active', 'inactive'),
  projectId:    Joi.string().trim().allow('', null),
  siteId:       Joi.string().trim().allow('', null),
});

const attendanceRecordSchema = Joi.object({
  labourId: Joi.string().trim().required(),
  status:   Joi.string().valid('present', 'absent', 'half_day', 'unmarked').required(),
  remarks:  Joi.string().trim().allow('', null),
});

const batchAttendanceSchema = Joi.object({
  date:      Joi.date().required().messages({ 'any.required': 'Attendance date is required' }),
  projectId: Joi.string().trim().allow('', null),
  siteId:    Joi.string().trim().allow('', null),
  records:   Joi.array().items(attendanceRecordSchema).min(1).required().messages({
    'array.min': 'At least one attendance record is required',
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

module.exports = { createLabourSchema, updateLabourSchema, batchAttendanceSchema, validate };
