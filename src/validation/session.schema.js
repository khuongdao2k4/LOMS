// File: validation/session.schema.js
const Joi = require("joi");

// Body activate session
const activateBody = Joi.object({
  tiktok_channel_id: Joi.string().required().messages({
    "string.base": "tiktok_channel_id ",
    "any.required": "tiktok_channel_id ",
  }),
  initial_revenue: Joi.number().min(0).required().messages({
    "number.base": "initial_revenue ",
    "number.min": "initial_revenue ",
    "any.required": "initial_revenue ",
  }),
});

// Body update revenue (kept for reference)
const revenueBody = Joi.object({
  revenue: Joi.number().min(0).required().messages({
    "number.base": "revenue ",
    "number.min": "revenue ",
    "any.required": "revenue ",
  }),
});

// Body upload screenshot (reference)
const screenshotBody = Joi.object({
  screenshot_url: Joi.string().uri().required().messages({
    "string.base": "screenshot_url ",
    "string.uri": "screenshot_url ",
    "any.required": "screenshot_url ",
  }),
});

// Body update session (actual time / revenue)
const updateSessionBody = Joi.object({
  actual_start_at: Joi.date().iso(),
  actual_end_at: Joi.date().iso(),
  total_hours: Joi.number(),
  revenue_start: Joi.number(),
  revenue_end: Joi.number(),
  revenue_total: Joi.number(),
  total_revenue: Joi.number(), // alias
  screenshot_url: Joi.string().uri(),
  screenshot_start_url: Joi.string().uri(),
  screenshot_end_url: Joi.string().uri(),
  late_flag: Joi.number().integer(),
  status: Joi.string().valid("ACTIVE", "ENDED", "FORCE_CLOSED"),
}).min(1);

// Body stop session (require final_revenue + screenshot)
const stopBody = Joi.object({
  final_revenue: Joi.number().min(0).required().messages({
    "number.base": "final_revenue",
    "number.min": "final_revenue",
    "any.required": "final_revenue",
  }),
  screenshot_url: Joi.string().uri().optional(),
  screenshot_end_url: Joi.string().uri().optional(),
});


const historyQuery = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(200).default(20),
});

module.exports = {
  activateBody,
  revenueBody,
  screenshotBody,
  stopBody,
  updateSessionBody,
  historyQuery,
};
