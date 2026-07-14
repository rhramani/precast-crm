const Joi = require('joi');

const createExpenseSchema = Joi.object({
  projectId:       Joi.string().trim().required().messages({ 'any.required': 'Project mapping is required' }),
  siteId:          Joi.string().trim().required().messages({ 'any.required': 'Site destination is required' }),
  expenseCategory: Joi.string().valid('transport', 'fuel', 'food', 'consumables', 'labour_welfare', 'labour', 'crane', 'jcb', 'accommodation', 'other').default('other'),
  amount:          Joi.number().positive().required().messages({
    'number.positive': 'Expense amount must be greater than zero',
    'any.required': 'Expense amount is required',
  }),
  expenseDate:     Joi.date().default(() => new Date()),
  description:     Joi.string().trim().allow('', null),
  branchId:        Joi.string().trim().allow('', null),
});

const updateExpenseSchema = Joi.object({
  expenseCategory: Joi.string().valid('transport', 'fuel', 'food', 'consumables', 'labour_welfare', 'labour', 'crane', 'jcb', 'accommodation', 'other'),
  amount:          Joi.number().positive(),
  expenseDate:     Joi.date(),
  description:     Joi.string().trim().allow('', null),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { createExpenseSchema, updateExpenseSchema, validate };
