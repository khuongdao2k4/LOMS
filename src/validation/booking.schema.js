// validation/booking.schema.js
const Joi = require("joi");
const { Channel, BookingConfig } = require("../models");

// ============ PUBLIC SCHEMAS ============

const resolveChannelSchema = Joi.object({
  token: Joi.string().required().trim(),
});

const getPublicBookingsSchema = Joi.object({
  channel_id: Joi.number().integer().positive().required(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().min(Joi.ref("from")).optional(),
});

const createPublicBookingSchema = Joi.object({
  channel_id: Joi.number().integer().positive().required(),
  start_at: Joi.date().iso().required(),
  end_at: Joi.date().iso().greater(Joi.ref("start_at")).required(),
  full_name: Joi.string().trim().min(2).max(150).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]+$/)
    .min(10)
    .max(30)
    .required(),
  note: Joi.string().trim().max(1000).allow("", null).optional(),
});

const getPublicBookingByIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  token: Joi.string().required().trim(),
});

const cancelPublicBookingSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  token: Joi.string().required().trim(),
});

// ============ ADMIN CONFIG SCHEMAS ============

const updateBookingConfigSchema = Joi.object({
  slots: Joi.array()
    .items(
      Joi.object({
        weekday: Joi.number().integer().min(1).max(7).required(),
        start: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
          .required(),
        end: Joi.string()
          .pattern(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/)
          .required(),
      })
    )
    .min(1)
    .required()
    .custom((value, helpers) => {
      // Validate start < end cho mỗi slot
      for (const slot of value) {
        if (slot.start >= slot.end) {
          return helpers.message(
            `Invalid time range for weekday ${slot.weekday}: start (${slot.start}) must be before end (${slot.end})`
          );
        }
      }
      return value;
    }),
  min_duration_minutes: Joi.number().integer().min(5).max(1440).required(),
  max_duration_minutes: Joi.number()
    .integer()
    .min(Joi.ref("min_duration_minutes"))
    .max(1440)
    .required(),
  is_active: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .default(true),
  public_token: Joi.string().trim().min(10).max(150).optional(),
});

// ============ ADMIN BOOKING SCHEMAS ============

const getAdminBookingsSchema = Joi.object({
  status: Joi.string()
    .valid("PENDING", "APPROVED", "REJECTED", "CANCELLED", "all")
    .default("all"),
  channel_id: Joi.number().integer().positive().optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().min(Joi.ref("from")).optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const approveBookingSchema = Joi.object({
  note: Joi.string().trim().max(500).allow("", null).optional(),
});

const rejectBookingSchema = Joi.object({
  note: Joi.string().trim().max(500).allow("", null).optional(),
});

const cancelBookingSchema = Joi.object({
  note: Joi.string().trim().max(500).allow("", null).optional(),
});

// ============ VALIDATION MIDDLEWARES ============

/**
 * Middleware kiểm tra channel tồn tại khi tạo/update config
 */
async function validateChannelExistence(req, res, next) {
  try {
    const channelId = parseInt(req.params.id);

    if (!channelId || isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid channel ID",
      });
    }

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: `Channel ${channelId} not found`,
      });
    }

    next();
  } catch (err) {
    console.error("❌ validateChannelExistence error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

/**
 * Middleware kiểm tra booking config tồn tại
 */
async function validateBookingConfigExistence(req, res, next) {
  try {
    const { channel_id } = req.body;

    if (!channel_id) {
      return next(); // Skip nếu không có channel_id trong body
    }

    // ✅ SỬA: Dùng channel_id thay vì channelId
    const config = await BookingConfig.findOne({
      where: { channel_id: channel_id },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: `Booking config not found for channel ${channel_id}`,
      });
    }

    // ✅ SỬA: Dùng is_active thay vì isActive
    if (!config.is_active) {
      return res.status(400).json({
        success: false,
        message: "Booking is currently disabled for this channel",
      });
    }

    next();
  } catch (err) {
    console.error("❌ validateBookingConfigExistence error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  // Public
  resolveChannelSchema,
  getPublicBookingsSchema,
  createPublicBookingSchema,
  getPublicBookingByIdSchema,
  cancelPublicBookingSchema,

  // Admin Config
  updateBookingConfigSchema,

  // Admin Booking
  getAdminBookingsSchema,
  approveBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,

  // Middlewares
  validateChannelExistence,
  validateBookingConfigExistence,
};
