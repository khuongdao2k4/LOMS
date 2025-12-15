const Joi = require("joi");

// 1️⃣ Query for report + export - ✅ FIXED: Thêm month/year
const reportQuerySchema = Joi.object({
  from: Joi.string().isoDate().optional(),
  to: Joi.string().isoDate().optional(),
  employee_id: Joi.number().integer().optional(),
  month: Joi.number().integer().min(1).max(12).optional(),
  year: Joi.number().integer().min(2000).optional(),
}).custom((value, helpers) => {
  // Validation: Nếu có month thì phải có year và ngược lại
  if ((value.month && !value.year) || (!value.month && value.year)) {
    return helpers.error("any.invalid", {
      message: "month và year phải được cung cấp cùng nhau",
    });
  }

  // Validation: Không được dùng cả (from/to) và (month/year) cùng lúc
  if ((value.from || value.to) && (value.month || value.year)) {
    return helpers.error("any.invalid", {
      message:
        "Không được sử dụng cả khoảng thời gian (from/to) và tháng/năm (month/year) cùng lúc",
    });
  }

  return value;
});

//  PUT /session/:id -  FIXED: Thêm validation cho revenue
const manualUpdateBodySchema = Joi.object({
  actual_start_at: Joi.string().isoDate().optional(),
  actual_end_at: Joi.string().isoDate().optional(),
  revenue_start: Joi.number().min(0).optional(),
  revenue_end: Joi.number().min(0).optional(),
  screenshot_url: Joi.string().uri().optional(),
  screenshot_start_url: Joi.string().uri().optional(),
  screenshot_end_url: Joi.string().uri().optional(),
  late_flag: Joi.boolean().optional(),
  status: Joi.string().valid("ACTIVE", "ENDED", "FORCE_CLOSED").optional(),
}).custom((value, helpers) => {
  //  Validation: actual_end_at phải sau actual_start_at
  if (value.actual_start_at && value.actual_end_at) {
    if (new Date(value.actual_end_at) <= new Date(value.actual_start_at)) {
      return helpers.error("any.invalid", {
        message: "actual_end_at phải sau actual_start_at",
      });
    }
  }

  // Validation: revenue_end phải >= revenue_start
  if (value.revenue_start !== undefined && value.revenue_end !== undefined) {
    if (value.revenue_end < value.revenue_start) {
      return helpers.error("any.invalid", {
        message: "revenue_end phải lớn hơn hoặc bằng revenue_start",
      });
    }
  }

  return value;
});

//  POST /salary-report
const generateSalarySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear())
    .required(),
});

module.exports = {
  reportQuerySchema,
  manualUpdateBodySchema,
  generateSalarySchema,
};
