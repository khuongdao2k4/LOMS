const { Op } = require("sequelize");
const db = require("../models");
const eventMemberService = require("./eventMember.service");
const scheduleStaffService = require("./scheduleStaff.service");

const { Schedule, Event, EventMember } = db;

// Offset phút cho múi giờ business (vd VN = +420). Giúp sinh event nhất quán, không phụ thuộc timezone máy.
const SCHEDULE_TZ_OFFSET_MIN = Number(
  process.env.SCHEDULE_TZ_OFFSET_MIN ??
    process.env.DB_TZ_OFFSET_MIN ??
    -new Date().getTimezoneOffset() // fallback: offset của máy chủ (vd VN = 420)
);
const SCHEDULE_TZ_OFFSET_MS = SCHEDULE_TZ_OFFSET_MIN * 60 * 1000;

/**
 * Trả về đầu ngày (00:00:00) theo timezone business (offset cố định)
 */
function startOfDay(date) {
  const shifted = new Date(date.getTime() + SCHEDULE_TZ_OFFSET_MS);
  const utcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    0,
    0,
    0,
    0
  );
  return new Date(utcMs - SCHEDULE_TZ_OFFSET_MS);
}

/**
 * Cộng thêm số ngày vào date
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Lấy thứ trong tuần theo timezone business: 1 = Thứ 2, ..., 7 = Chủ nhật
 */
function getWeekdayIndex(date) {
  const shifted = new Date(date.getTime() + SCHEDULE_TZ_OFFSET_MS);
  const js = shifted.getUTCDay(); // 0=CN..6=Thứ 7
  return js === 0 ? 7 : js; // thành 1..7
}

/**
 * Kiểm tra xem weekdays_mask có bật bit cho thứ này không
 */
function hasWeekday(mask, weekdayIndex) {
  if (mask == null) return false;
  const bit = 1 << (weekdayIndex - 1); // 1 -> bit0, 7 -> bit6
  return (mask & bit) !== 0;
}

/**
 * Ghép ngày (date) với time dạng "HH:mm:ss" theo timezone business (offset cố định)
 */
function combineDateAndTime(date, timeStr) {
  if (!timeStr) {
    throw new Error("schedule.start_at / end_at bị thiếu");
  }
  const parts = timeStr.split(":").map((v) => parseInt(v, 10) || 0);
  const [h, m, s] = parts;
  const shifted = new Date(date.getTime() + SCHEDULE_TZ_OFFSET_MS);
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

/**
 * Sinh events từ các schedules đang active cho tương lai.
 *
 * @param {Object} options
 * @param {number} options.days - số ngày tương lai cần sinh event.
 *                               Nếu KHÔNG truyền thì mặc định sinh cho ~1 tháng tới.
 * @param {Date}   options.fromDate - ngày bắt đầu (mặc định: hôm nay)
 */
async function generateEventsFromSchedules({ days, fromDate } = {}) {
  const now = new Date();
  const base = fromDate ? startOfDay(fromDate) : startOfDay(now);

  // 🆕 Nếu không truyền days -> tự tính số ngày cho 1 tháng tới
  let totalDays;
  if (typeof days === "number" && days > 0) {
    totalDays = days;
  } else {
    // endDate = cùng ngày này ở tháng sau (xấp xỉ 1 tháng)
    const endDate = new Date(base);
    endDate.setMonth(endDate.getMonth() + 1);

    const diffMs = startOfDay(endDate).getTime() - base.getTime();
    totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  const schedules = await Schedule.findAll({
    where: {
      is_active: true,
      weekdays_mask: { [Op.gt]: 0 },
    },
  });

  let createdCount = 0;

  for (const sched of schedules) {
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(base, i);
      const weekdayIndex = getWeekdayIndex(date);

      // Nếu thứ này không có trong mask thì bỏ qua
      if (!hasWeekday(sched.weekdays_mask, weekdayIndex)) {
        continue;
      }

      const eventStart = combineDateAndTime(date, sched.start_at);
      const eventEnd = combineDateAndTime(date, sched.end_at);

      // Không tạo event cho khoảng thời gian đã kết thúc
      if (eventEnd <= now) {
        continue;
      }

      // Kiểm tra đã tồn tại event tương ứng chưa
      const exists = await Event.findOne({
        where: {
          schedule_id: sched.id,
          start_at: {
            [Op.eq]: eventStart,
          },
        },
      });

      if (exists) {
        await ensureEventHasScheduleStaff(exists.id, sched.id);
        continue;
      }

      const ev = await Event.create({
        schedule_id: sched.id,
        channel_id: sched.channel_id,
        start_at: eventStart,
        end_at: eventEnd,
        revenue_enabled: true,
        is_active: true,
      });

      const scheduleStaff = await scheduleStaffService.listBySchedule(sched.id);
      if (scheduleStaff.length > 0) {
        const members = scheduleStaff.map((st) => ({
          employee_id: st.employee_id,
          role: st.role,
          priority: st.priority,
          is_primary: st.is_primary,
        }));
        await eventMemberService.assignMembers(ev.id, members);
      }

      createdCount += 1;
    }
  }

  return { created: createdCount };
}

async function ensureEventHasScheduleStaff(eventId, scheduleId) {
  if (!eventId || !scheduleId) return;

  const count = await EventMember.count({
    where: { event_id: eventId },
  });
  if (count > 0) return;

  const scheduleStaff = await scheduleStaffService.listBySchedule(scheduleId);
  if (!scheduleStaff.length) return;

  const members = scheduleStaff.map((st) => ({
    employee_id: st.employee_id,
    role: st.role,
    priority: st.priority,
    is_primary: st.is_primary,
  }));
  await eventMemberService.assignMembers(eventId, members);
}

module.exports = {
  generateEventsFromSchedules,
};
