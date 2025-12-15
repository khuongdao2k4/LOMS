const {
  Event,
  EventMember,
  Schedule,
  Channel,
  Session,
  Employee,
} = require("../models");
const { Op } = require("sequelize");
const scheduleStaffService = require("./scheduleStaff.service");

// Offset phút cho múi giờ business (vd VN = +420) để ghép giờ Schedule không phụ thuộc timezone máy chủ
const SCHEDULE_TZ_OFFSET_MIN = Number(
  process.env.SCHEDULE_TZ_OFFSET_MIN ??
    process.env.DB_TZ_OFFSET_MIN ??
    -new Date().getTimezoneOffset() // fallback: offset của máy chủ (vd VN = 420)
);
const SCHEDULE_TZ_OFFSET_MS = SCHEDULE_TZ_OFFSET_MIN * 60 * 1000;

function buildDateWithScheduleOffset(baseDate, timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
  const [h, m, s] = parts;
  const shifted = new Date(baseDate.getTime() + SCHEDULE_TZ_OFFSET_MS);
  const utcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    h || 0,
    m || 0,
    s || 0,
    0
  );
  return new Date(utcMs - SCHEDULE_TZ_OFFSET_MS);
}

function now() {
  return new Date();
}

async function list({
  channelId,
  channel_id,
  from,
  to,
  page = 1,
  pageSize = 20,
  employeeId,
  employee_id,
}) {
  const where = {};

  // Hỗ trợ cả channelId (camelCase) và channel_id (snake_case)
  const finalChannelId = channelId || channel_id;
  const finalEmployeeId = employeeId || employee_id;

  if (finalChannelId) where.channel_id = finalChannelId;
  if (from) where.start_at = { [Op.gte]: new Date(from) };
  if (to)
    where.end_at = Object.assign(where.end_at || {}, {
      [Op.lte]: new Date(to),
    });

  // Include mặc định cho members
  const membersInclude = {
    model: EventMember,
    as: "members",
    attributes: ["event_id", "employee_id", "role", "priority", "is_primary"],
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "full_name", "portrait_url"],
      },
    ],
  };

  // Nếu filter theo nhân viên -> chỉ lấy event mà nhân viên này được phân công
  if (finalEmployeeId) {
    membersInclude.where = { employee_id: finalEmployeeId };
    membersInclude.required = true;
  }

  const result = await Event.findAndCountAll({
    where,
    include: [
      membersInclude,
      {
        model: Channel,
        as: "channel",
        attributes: ["id", "tiktok_channel_id", "name", "created_at"],
      },
    ],
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [["start_at", "ASC"]],
  });
  return { total: result.count, data: result.rows };
}

async function getById(id) {
  return Event.findByPk(id, {
    include: [
      {
        model: EventMember,
        as: "members",
        attributes: ["event_id", "employee_id", "role", "priority", "is_primary"],
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "full_name", "portrait_url"],
          },
        ],
      },
      {
        model: Channel,
        as: "channel",
        attributes: ["id", "tiktok_channel_id", "name", "created_at"],
      },
    ],
  });
}

/**
 * F3.3: Kiểm tra trùng giờ trong cùng channel
 */
async function checkOverlap(channelId, startAt, endAt, excludeId = null) {
  const where = {
    channel_id: channelId,
    [Op.or]: [
      // Case 1: Event mới bắt đầu trong khoảng event cũ
      { start_at: { [Op.between]: [startAt, endAt] } },
      // Case 2: Event mới kết thúc trong khoảng event cũ
      { end_at: { [Op.between]: [startAt, endAt] } },
      // Case 3: Event mới bao trùm event cũ
      {
        [Op.and]: [
          { start_at: { [Op.lte]: startAt } },
          { end_at: { [Op.gte]: endAt } },
        ],
      },
    ],
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const conflict = await Event.findOne({ where });
  return conflict;
}

/**
 *  Kiểm tra nhân viên có bị trùng ca không
 */
async function checkEmployeeConflict(
  memberIds,
  startAt,
  endAt,
  excludeEventId = null
) {
  if (!memberIds || memberIds.length === 0) return null;

  const eventWhere = {
    [Op.or]: [
      { start_at: { [Op.between]: [startAt, endAt] } },
      { end_at: { [Op.between]: [startAt, endAt] } },
      {
        [Op.and]: [
          { start_at: { [Op.lte]: startAt } },
          { end_at: { [Op.gte]: endAt } },
        ],
      },
    ],
  };
  if (excludeEventId) {
    eventWhere.id = { [Op.ne]: excludeEventId };
  }

  const conflictingEvents = await Event.findAll({
    where: eventWhere,
    include: [
      {
        model: EventMember,
        as: "members",
        where: {
          employee_id: { [Op.in]: memberIds },
        },
        required: true,
        include: [
          {
            model: Employee,
            as: "employee",
            attributes: ["id", "full_name"],
          },
        ],
      },
    ],
  });

  if (conflictingEvents.length > 0) {
    const conflictEmployee = conflictingEvents[0].members[0];
    return {
      employee_id: conflictEmployee.employee_id,
      employee_name:
        conflictEmployee.employee?.full_name ||
        `Employee ${conflictEmployee.employee_id}`,
      event_id: conflictingEvents[0].id,
      event_time: `${conflictingEvents[0].start_at} - ${conflictingEvents[0].end_at}`,
    };
  }

  return null;
}

/**
 * F3.2 + F3.3 + F3.4.1: Tạo ca làm việc
 */
async function create(payload) {
  const hasMembersKey = Object.prototype.hasOwnProperty.call(payload, "members");
  // F3.2: Nếu có schedule_id thì tự sinh thông tin từ Schedule
  if (payload.schedule_id) {
    const schedule = await Schedule.findByPk(payload.schedule_id);
    if (!schedule) {
      const err = new Error("Schedule not found");
      err.status = 400;
      throw err;
    }

    const today = new Date();
    const startFromSchedule = buildDateWithScheduleOffset(
      today,
      schedule.start_at
    );
    const endFromSchedule = buildDateWithScheduleOffset(
      today,
      schedule.end_at
    );
    payload.start_at = payload.start_at || startFromSchedule;
    payload.end_at = payload.end_at || endFromSchedule;
    payload.channel_id = payload.channel_id || schedule.channel_id;
    if (!hasMembersKey || payload.members == null) {
      const scheduleStaff = await scheduleStaffService.listBySchedule(
        payload.schedule_id
      );
      if (scheduleStaff.length > 0) {
        payload.members = scheduleStaff.map((st) => ({
          employee_id: st.employee_id,
          role: st.role,
          priority: st.priority,
          is_primary: st.is_primary,
        }));
      }
    }
  }

  // Kiểm tra start_at < end_at
  if (new Date(payload.start_at) >= new Date(payload.end_at)) {
    const err = new Error("start_at must be before end_at");
    err.status = 400;
    throw err;
  }

  // F3.3: Kiểm tra trùng giờ cùng channel
  const channelConflict = await checkOverlap(
    payload.channel_id,
    payload.start_at,
    payload.end_at
  );
  if (channelConflict) {
    const err = new Error(
      `Event time overlaps with another event (ID: ${channelConflict.id}) on the same channel at ${channelConflict.start_at} - ${channelConflict.end_at}`
    );
    err.status = 400;
    throw err;
  }

  //  Kiểm tra nhân viên có bị trùng ca không
  if (payload.members && payload.members.length > 0) {
    const memberIds = payload.members.map((m) => m.employee_id);
    const employeeConflict = await checkEmployeeConflict(
      memberIds,
      payload.start_at,
      payload.end_at
    );

    if (employeeConflict) {
      const err = new Error(
        `Employee "${employeeConflict.employee_name}" (ID: ${employeeConflict.employee_id}) is already assigned to another event (ID: ${employeeConflict.event_id}) at ${employeeConflict.event_time}`
      );
      err.status = 400;
      throw err;
    }
  }

  const ev = await Event.create(payload, { returning: true });
  return ev;
}

/**
 * F3.4.3: Cập nhật ca làm việc
 */
async function update(id, payload) {
  const event = await Event.findByPk(id);
  if (!event) {
    const err = new Error("Event not found");
    err.status = 404;
    throw err;
  }

  const finalChannelId = payload.channel_id || event.channel_id;
  const finalStartAt = payload.start_at || event.start_at;
  const finalEndAt = payload.end_at || event.end_at;

  // start_at phải trước end_at (dù ca đã qua hay tương lai)
  if (new Date(finalStartAt) >= new Date(finalEndAt)) {
    const err = new Error("start_at must be before end_at");
    err.status = 400;
    throw err;
  }

  //  F3.3: Kiểm tra trùng giờ nếu thay đổi thời gian hoặc channel
  const channelConflict = await checkOverlap(
    finalChannelId,
    finalStartAt,
    finalEndAt,
    id
  );
  if (channelConflict) {
    const err = new Error(
      `Updated event overlaps with another event (ID: ${channelConflict.id}) on the same channel at ${channelConflict.start_at} - ${channelConflict.end_at}`
    );
    err.status = 400;
    throw err;
  }

  //  Kiểm tra nhân viên có bị trùng ca không
  if (payload.members && payload.members.length > 0) {
    const memberIds = payload.members.map((m) => m.employee_id);
    const employeeConflict = await checkEmployeeConflict(
      memberIds,
      finalStartAt,
      finalEndAt,
      id
    );

    if (employeeConflict) {
      const err = new Error(
        `Employee "${employeeConflict.employee_name}" (ID: ${employeeConflict.employee_id}) is already assigned to another event (ID: ${employeeConflict.event_id}) at ${employeeConflict.event_time}`
      );
      err.status = 400;
      throw err;
    }
  }

  await event.update(payload);
  return event;
}

/**
 * F3.4.2: CẤM xóa ca đã kết thúc
 */
async function remove(id) {
  const event = await Event.findByPk(id);
  if (!event) {
    const err = new Error("Event not found");
    err.status = 404;
    throw err;
  }

  if (new Date(event.end_at) < now()) {
    const err = new Error("Cannot delete event that already ended");
    err.status = 400;
    throw err;
  }

  await event.destroy();
  return true;
}

module.exports = { list, getById, create, update, remove };

