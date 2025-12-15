const bookingService = require("../services/booking.service");

async function resolveChannel(req, res) {
  try {
    const { token } = req.query;
    const data = await bookingService.resolveChannel(token);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function getPublicBookings(req, res) {
  try {
    const { channel_id, from, to } = req.query;

    const data = await bookingService.getPublicBookings(
      parseInt(channel_id),
      from,
      to
    );

    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function createPublicBooking(req, res) {
  try {
    const payload = req.body;
    const data = await bookingService.createPublicBooking(payload);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
      error: err.error,
      details: err.details,
      conflicting_bookings: err.conflicting_bookings,
    });
  }
}

async function getPublicBookingById(req, res) {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const data = await bookingService.getPublicBookingById(parseInt(id), token);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function cancelPublicBooking(req, res) {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const data = await bookingService.cancelPublicBooking(parseInt(id), token);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

module.exports = {
  resolveChannel,
  getPublicBookings,
  createPublicBooking,
  getPublicBookingById,
  cancelPublicBooking,
};
