// Giữ nguyên ý tưởng của bạn, chỉ nới thêm experience/note optional
const Joi = require('joi');

const employeeCreate = Joi.object({
  full_name: Joi.string().max(150).required(),
  gender: Joi.string().valid('MALE','FEMALE','OTHER').required(),
  date_of_birth: Joi.date().iso().required(),
  hometown: Joi.string().max(255).required(),
  address: Joi.string().max(255).required(),
  cccd: Joi.string().max(20).required(),
  portrait_url: Joi.string().uri().required(),
  join_date: Joi.date().iso().required(),
  telegram_id: Joi.string().max(100).required(),
  account_id: Joi.alternatives().try(Joi.number().integer(), Joi.valid(null)).default(null),
  is_active: Joi.boolean().default(true),
  experience: Joi.string().max(255).allow('', null),
  note: Joi.string().allow('', null)
});

const employeeUpdate = employeeCreate.fork(
  ['full_name','gender','date_of_birth','hometown','address','cccd','portrait_url','join_date','telegram_id'],
  (schema) => schema.optional()
);

module.exports = { employeeCreate, employeeUpdate };
