const Joi = require("joi");

const typeEnum = ["NETWORK", "CHANNEL", "EMPLOYEE"];
const sectionEnum = ["DAILY", "MONTHLY", "YEARLY"];
const sortByEnum = ["date_value", "total_revenue", "total_hours", "created_at"];
const sortDirEnum = ["ASC", "DESC"];
const detailEnum = ["aggregate", "session"];

// Query cho list/chart/export
const revenueQuerySchema = Joi.object({
  from: Joi.string().isoDate().optional(),
  to: Joi.string().isoDate().optional(),
  type: Joi.string()
    .valid(...typeEnum)
    .default("NETWORK"),
  section: Joi.string()
    .valid(...sectionEnum)
    .default("DAILY"),
  value_id: Joi.number().integer().optional(), // required khi type != NETWORK (handled in custom)
  detail: Joi.string()
    .valid(...detailEnum)
    .default("aggregate"),
  page: Joi.number().integer().min(1).default(1),
  page_size: Joi.number().integer().min(1).max(200).default(20),
  sort_by: Joi.string()
    .valid(...sortByEnum)
    .default("date_value"),
  sort_dir: Joi.string()
    .valid(...sortDirEnum)
    .default("DESC"),
}).custom((value, helpers) => {
  if (value.type !== "NETWORK" && !value.value_id) {
    return helpers.error("any.invalid", {
      message: "value_id is required when type is not NETWORK",
    });
  }
  // Validate range logic
  if (value.from && value.to && new Date(value.to) < new Date(value.from)) {
    return helpers.error("any.invalid", {
      message: "to must be after from",
    });
  }
  return value;
});

// Body update 1 record
const revenueUpdateSchema = Joi.object({
  total_revenue: Joi.number().min(0).optional(),
  total_hours: Joi.number().min(0).optional(),
}).custom((value, helpers) => {
  if (
    value.total_revenue === undefined &&
    value.total_hours === undefined
  ) {
    return helpers.error("any.invalid", {
      message: "At least one of total_revenue or total_hours is required",
    });
  }
  return value;
});

// Body for aggregate job (build MONTHLY/YEARLY from DAILY)
const revenueAggregateSchema = Joi.object({
  section: Joi.string().valid("MONTHLY", "YEARLY").required(),
  from: Joi.string().isoDate().optional(),
  to: Joi.string().isoDate().optional(),
}).custom((value, helpers) => {
  if (value.from && value.to && new Date(value.to) < new Date(value.from)) {
    return helpers.error("any.invalid", { message: "to must be after from" });
  }
  return value;
});

module.exports = {
  revenueQuerySchema,
  revenueUpdateSchema,
  revenueAggregateSchema,
};
