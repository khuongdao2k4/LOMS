// src/validation/account.schema.js
const Joi = require('joi');

const accountCreate = Joi.object({
  username: Joi.string().min(3).max(100).required(),
  password: Joi.string().min(6).max(100).required(),
  employee_id: Joi.number().integer().allow(null)
});

const resetPassword = Joi.object({
  newPassword: Joi.string().min(6).max(100).required()
});

const updateRoles = Joi.object({
  roles: Joi.array().items(Joi.string().valid('ADMIN','EMPLOYEE')).min(1).required()
});

module.exports = { accountCreate, resetPassword, updateRoles };
