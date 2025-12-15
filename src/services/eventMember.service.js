const { EventMember, Event, Employee } = require("../models");
const { Op } = require("sequelize");

async function assignMembers(eventId, members = []) {
  // members: [{ employee_id, role: 'LIVE'|'SUPPORT', priority, is_primary }]
  const event = await Event.findByPk(eventId);
  if (!event) {
    const err = new Error("Event not found");
    err.status = 404;
    throw err;
  }


  for (const m of members) {
    const emp = await Employee.findByPk(m.employee_id);
    if (!emp)
      throw Object.assign(new Error(`Employee ${m.employee_id} not found`), {
        status: 400,
      });
  }


  await EventMember.destroy({ where: { event_id: eventId } });
  const payload = members.map((m) => ({
    event_id: eventId,
    employee_id: m.employee_id,
    role: m.role,
    priority: m.priority || null,
    is_primary: !!m.is_primary,
  }));

  await EventMember.bulkCreate(payload);
  return EventMember.findAll({ where: { event_id: eventId } });
}

async function removeMember(eventId, employeeId, role) {
  // Kiểm tra event tồn tại
  const event = await Event.findByPk(eventId);
  if (!event) {
    throw Object.assign(new Error("Event not found"), { status: 404 });
  }

  const where = { event_id: eventId, employee_id: employeeId };
  if (role) where.role = role;

  // ✅ Kiểm tra nếu xóa LIVE cuối cùng
  if (role === "LIVE") {
    const liveCount = await EventMember.count({
      where: { event_id: eventId, role: "LIVE" },
    });

    if (liveCount <= 1) {
      throw Object.assign(
        new Error("Cannot remove the last LIVE member from event"),
        { status: 400 }
      );
    }
  }

  const deleted = await EventMember.destroy({ where });
  return deleted;
}

module.exports = { assignMembers, removeMember };
