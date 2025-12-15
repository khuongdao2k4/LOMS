const {
  Schedule,
  Channel,
  Event,
  EventMember,
  Session,
  sequelize,
  ScheduleStaff,
  Employee,
} = require("../models");
const { Op } = require("sequelize");
const scheduleStaffService = require("./scheduleStaff.service");

// Offset phút cho múi giờ business (vd VN = +420) để chuẩn hóa giờ schedule tránh lệch giữa máy
const SCHEDULE_TZ_OFFSET_MIN = Number(
  process.env.SCHEDULE_TZ_OFFSET_MIN ??
    process.env.DB_TZ_OFFSET_MIN ??
    -new Date().getTimezoneOffset() // fallback: offset của máy chủ (vd VN = 420)
);
const SCHEDULE_TZ_OFFSET_MS = SCHEDULE_TZ_OFFSET_MIN * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Chuẩn hóa start_at/end_at về dạng "HH:mm:ss", chấp nhận ISO/Z hoặc HH:mm[:ss]
function normalizeTimeInput(value) {
  if (!value) return value;
  let hours;
  let minutes;
  let seconds;

  if (value instanceof Date || (typeof value === "string" && value.includes("T"))) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) {
      const err = new Error("Invalid time format");
      err.status = 400;
      throw err;
    }
    // Giả định giờ nhập là giờ business; nếu nhận ISO-Z thì cộng offset để lấy giờ local business
    const shifted = new Date(d.getTime() + SCHEDULE_TZ_OFFSET_MS);
    hours = shifted.getUTCHours();
    minutes = shifted.getUTCMinutes();
    seconds = shifted.getUTCSeconds();
  } else {
    const parts = String(value).split(":").map((v) => parseInt(v, 10) || 0);
    [hours, minutes, seconds] = parts;
  }

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    (seconds != null && (seconds < 0 || seconds > 59))
  ) {
    const err = new Error("Invalid time format");
    err.status = 400;
    throw err;
  }

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds || 0)}`;
}

const scheduleInclude = [
  { model: Channel, as: "channel" },
  {
    model: ScheduleStaff,
    as: "staff",
    required: false,
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "full_name", "portrait_url"],
      },
    ],
  },
];

async function list({ channelId, isActive, page = 1, pageSize = 20 }) {
  page = Number(page) || 1;
  pageSize = Number(pageSize) || 20;
  const where = {};
  if (channelId) where.channel_id = channelId;
  if (typeof isActive !== "undefined") where.is_active = !!isActive;

  const { count, rows } = await Schedule.findAndCountAll({
    where,
    include: scheduleInclude,
    offset: (page - 1) * pageSize,
    limit: pageSize,
    order: [["id", "DESC"]],
  });
  return { total: count, data: rows };
}

async function getById(id) {
  return Schedule.findByPk(id, { include: scheduleInclude });
}

async function checkOverlap(channelId, start_at, end_at, excludeId = null) {
  const where = {
    channel_id: channelId,
    [Op.or]: [
      {
        start_at: { [Op.lt]: end_at },
        end_at: { [Op.gt]: start_at },
      },
    ],
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  const exists = await Schedule.findOne({ where });
  return !!exists;
}

async function create(payload) {
  const hasStaffKey = Object.prototype.hasOwnProperty.call(payload, "staff");
  const rawStaff = payload.staff;
  if (hasStaffKey && rawStaff != null && !Array.isArray(rawStaff)) {
    const err = new Error("staff must be an array");
    err.status = 400;
    throw err;
  }
  delete payload.staff;

  payload.start_at = normalizeTimeInput(payload.start_at);
  payload.end_at = normalizeTimeInput(payload.end_at);

  // 1. start < end
  if (payload.start_at >= payload.end_at) {
    const err = new Error("start_at must be before end_at");
    err.status = 400;
    throw err;
  }

  // 2. Rule 3.4: Check overlap
  const isOverlap = await checkOverlap(
    payload.channel_id,
    payload.start_at,
    payload.end_at
  );

  if (isOverlap) {
    const err = new Error(
      "Schedule time overlaps an existing schedule of this channel"
    );
    err.status = 400;
    throw err;
  }

  const schedule = await Schedule.create(payload);
  if (hasStaffKey) {
    await scheduleStaffService.replaceForSchedule(
      schedule.id,
      Array.isArray(rawStaff) ? rawStaff : []
    );
  }
  return getById(schedule.id);
}

async function update(id, payload) {
  const hasStaffKey = Object.prototype.hasOwnProperty.call(payload, "staff");
  const rawStaff = payload.staff;
  if (hasStaffKey && rawStaff != null && !Array.isArray(rawStaff)) {
    const err = new Error("staff must be an array");
    err.status = 400;
    throw err;
  }
  delete payload.staff;

  const schedule = await Schedule.findByPk(id);
  if (!schedule) {
    const err = new Error("Schedule not found");
    err.status = 404;
    throw err;
  }

  const normalizedStart =
    typeof payload.start_at !== "undefined"
      ? normalizeTimeInput(payload.start_at)
      : undefined;
  const normalizedEnd =
    typeof payload.end_at !== "undefined"
      ? normalizeTimeInput(payload.end_at)
      : undefined;

  if (typeof normalizedStart !== "undefined") payload.start_at = normalizedStart;
  if (typeof normalizedEnd !== "undefined") payload.end_at = normalizedEnd;

  const newStart = normalizedStart || schedule.start_at;
  const newEnd = normalizedEnd || schedule.end_at;
  const newChannel = payload.channel_id || schedule.channel_id;

  if (newStart >= newEnd) {
    const err = new Error("start_at must be before end_at");
    err.status = 400;
    throw err;
  }

  // Rule 3.4: Check overlap except itself
  const isOverlap = await checkOverlap(newChannel, newStart, newEnd, id);

  if (isOverlap) {
    const err = new Error(
      "Schedule time overlaps an existing schedule of this channel"
    );
    err.status = 400;
    throw err;
  }

  await schedule.update(payload);
  if (hasStaffKey) {
    await scheduleStaffService.replaceForSchedule(
      schedule.id,
      Array.isArray(rawStaff) ? rawStaff : []
    );
  }
  return getById(id);
}

async function remove(id) {
  const schedule = await Schedule.findByPk(id);
  if (!schedule) {
    const err = new Error("Schedule not found");
    err.status = 404;
    throw err;
  }

  await sequelize.transaction(async (t) => {
    const events = await Event.findAll({
      where: { schedule_id: id },
      attributes: ["id"],
      transaction: t,
    });

    const eventIds = events.map((e) => e.id);

    if (eventIds.length > 0) {
      // Remove event staffing first to avoid orphan records
      await EventMember.destroy({
        where: { event_id: eventIds },
        transaction: t,
      });

      // Remove related sessions (snapshots) if any
      await Session.destroy({
        where: {
          [Op.or]: [{ event_id: eventIds }, { schedule_id: id }],
        },
        transaction: t,
      });
    } else {
      // If no events exist, still clear sessions linked to this schedule
      await Session.destroy({
        where: { schedule_id: id },
        transaction: t,
      });
    }

    await Event.destroy({ where: { schedule_id: id }, transaction: t });
    await schedule.destroy({ transaction: t });
  });

  return true;
}

module.exports = { list, getById, create, update, remove };
