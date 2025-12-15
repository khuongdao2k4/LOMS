const scheduleService = require("../services/schedule.service");
const scheduleAutoService = require("../services/scheduleAuto.service");

async function list(req, res) {
  try {
    const data = await scheduleService.list(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function get(req, res) {
  try {
    const id = req.params.id;
    const schedule = await scheduleService.getById(id);
    if (!schedule)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: schedule });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function create(req, res) {
  try {
    const payload = req.body;
    payload.created_by = req.user?.id || payload.created_by; // from auth
    const schedule = await scheduleService.create(payload);
    return res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function update(req, res) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const schedule = await scheduleService.update(id, payload);
    return res.json({ success: true, data: schedule });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function remove(req, res) {
  try {
    const id = req.params.id;
    await scheduleService.remove(id);
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

// ✅ Sinh events tự động từ schedules cho N ngày tới
async function generateFromSchedules(req, res) {
  try {
    const rawDays = req.body?.days ?? req.query?.days ?? 7;
    const days = Number(rawDays);
    const safeDays = Number.isNaN(days) ? 7 : days;

    const result = await scheduleAutoService.generateEventsFromSchedules({
      days: safeDays,
    });

    return res.json({
      success: true,
      data: result,
      message: `Đã sinh event từ schedules cho ${result.created} ca trong ${safeDays} ngày tới`,
    });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

module.exports = { list, get, create, update, remove, generateFromSchedules };
