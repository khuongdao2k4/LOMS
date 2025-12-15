const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/publicBooking.controller");
const validate = require("../middleware/validate");

// Import Joi schemas
const {
  resolveChannelSchema,
  getPublicBookingsSchema,
  createPublicBookingSchema,
  getPublicBookingByIdSchema,
  cancelPublicBookingSchema,
} = require("../validation/booking.schema");

// Import middleware functions
const bookingValidation = require("../validation/booking.schema");

router.get(
  "/public/channels/resolve",
  validate(resolveChannelSchema),
  ctrl.resolveChannel
);

router.get(
  "/public/bookings",
  validate(getPublicBookingsSchema),
  ctrl.getPublicBookings
);

router.post(
  "/public/bookings",
  validate(createPublicBookingSchema),
  bookingValidation.validateBookingConfigExistence, // ✅ Dùng từ module
  ctrl.createPublicBooking
);

router.get(
  "/public/bookings/:id",
  validate(getPublicBookingByIdSchema),
  ctrl.getPublicBookingById
);

router.delete(
  "/public/bookings/:id",
  validate(cancelPublicBookingSchema),
  ctrl.cancelPublicBooking
);

module.exports = router;
