const bookingService = require("../services/booking.service");

async function getBookingConfig(req, res) {
  try {
    const channelId = parseInt(req.params.id);
    console.log("Channel ID:", channelId);
    const data = await bookingService.getBookingConfig(channelId);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function updateBookingConfig(req, res) {
  try {
    const channelId = parseInt(req.params.id);
    const payload = req.body;
    const userId = req.user?.sub; // Lấy từ JWT
    const data = await bookingService.updateBookingConfig(
      channelId,
      payload,
      userId
    );
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
      error: err.error,
      details: err.details,
    });
  }
}

module.exports = {
  getBookingConfig,
  updateBookingConfig,
};
