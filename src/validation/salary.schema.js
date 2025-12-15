// src/validation/salary.schema.js
const Joi = require("joi");

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(200).optional(),
  q: Joi.string().allow("", null).optional(),
});

// Cho phép gửi number hoặc string-number
const money = Joi.alternatives()
  .try(
    Joi.number().min(0),
    Joi.string().pattern(/^\d+(\.\d+)?$/)
  )
  .custom((value, helpers) => {
    if (typeof value === "string") {
      const n = Number(value);
      if (Number.isNaN(n)) return helpers.error("any.invalid");
      return n;
    }
    return value;
  }, "cast string-number to number");

const patchBody = Joi.object({
  base_salary: money.optional(),
  hourly_rate_live: money.optional(),
  hourly_rate_support: money.optional(),
  // KHÔNG còn is_active
}).min(1);

module.exports = { listQuery, patchBody };
