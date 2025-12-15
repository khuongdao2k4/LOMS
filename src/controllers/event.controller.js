const eventService = require("../services/event.service");
const eventMemberService = require("../services/eventMember.service");
const { Employee } = require("../models");

async function list(req, res) {
  try {
    const data = await eventService.list(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function listMy(req, res) {
  try {
    // account_id lấy từ JWT (auth middleware đã gán req.user)
    const accountId = req.user && req.user.sub;

    if (!accountId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: missing account info" });
    }

    // Tìm nhân viên tương ứng với tài khoản hiện tại
    const employee = await Employee.findOne({
      where: { account_id: accountId },
    });

    if (!employee) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Không tìm thấy nhân viên tương ứng với tài khoản đang đăng nhập",
        });
    }

    // Ghép query gốc + filter theo employeeId
    const query = {
      ...req.query,
      employeeId: employee.id,
    };

    const data = await eventService.list(query);
    return res.json({ success: true, data });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function get(req, res) {
  try {
    const ev = await eventService.getById(req.params.id);
    if (!ev)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: ev });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function create(req, res) {
  try {
    const payload = req.body;
    // expect: channel_id, start_at, end_at, schedule_id?, revenue_enabled, members?
    const ev = await eventService.create(payload);
    if (payload.members && Array.isArray(payload.members)) {
      await eventMemberService.assignMembers(ev.id, payload.members);
    }
    const result = await eventService.getById(ev.id);
    return res.status(201).json({ success: true, data: result });
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
    const ev = await eventService.update(id, payload);
    if (payload.members && Array.isArray(payload.members)) {
      await eventMemberService.assignMembers(ev.id, payload.members);
    }
    const result = await eventService.getById(id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

async function remove(req, res) {
  try {
    await eventService.remove(req.params.id);
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
}

module.exports = { list, listMy, get, create, update, remove };
