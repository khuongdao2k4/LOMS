const bookingService = require("../services/booking.service");

async function getAdminBookings(req, res) {
  try {
    const filters = req.query;
    const data = await bookingService.getAdminBookings(filters);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function getAdminBookingById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const data = await bookingService.getAdminBookingById(id);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function approveBooking(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body;
    const userId = req.user?.sub; // Lấy từ JWT
    const data = await bookingService.approveBooking(id, userId, note);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
      error: err.error,
      conflicting_bookings: err.conflicting_bookings,
    });
  }
}

async function rejectBooking(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body;
    const userId = req.user?.sub; // Lấy từ JWT
    const data = await bookingService.rejectBooking(id, userId, note);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function cancelBooking(req, res) {
  try {
    const id = parseInt(req.params.id);
    const { note } = req.body;
    const userId = req.user?.sub; // Lấy từ JWT
    const data = await bookingService.cancelBooking(id, userId, note);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

module.exports = {
  getAdminBookings,
  getAdminBookingById,
  approveBooking,
  rejectBooking,
  cancelBooking,
};
