const {
  Session,
  SessionStaff,
  AutomationSetting,
  Event,
  Employee,
  EventMember,
  sequelize,
  Channel,
} = require("../models");
const { Op, fn, col, where } = require("sequelize");
const dayjs = require("dayjs");

// If DB stores local time (e.g., +7) add offset to get UTC
const DB_TZ_OFFSET_MIN = Number(process.env.DB_TZ_OFFSET_MIN || 0);
const DB_TZ_OFFSET_MS = DB_TZ_OFFSET_MIN * 60 * 1000;
const toUtcFromDbLocal = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return d;
  return new Date(d.getTime() + DB_TZ_OFFSET_MS);
};

class SessionService {
  static async getActiveSession({ channel_id, employee_id } = {}) {
    const where = { status: "ACTIVE", is_active: true };

    if (channel_id) {
      where.channel_id = channel_id;
    }

    const include = [
      {
        model: Channel,
        as: "channel",
        attributes: ["id", "name", "tiktok_channel_id"],
      },
      {
        model: Event,
        as: "event",
        attributes: ["id", "start_at", "end_at", "revenue_enabled"],
        include: [
          {
            model: EventMember,
            as: "members",
            include: [
              {
                model: Employee,
                as: "employee",
                attributes: ["id", "full_name"],
              },
            ],
          },
        ],
      },
      {
        model: SessionStaff,
        as: "staff",
        include: [
          {
            model: Employee,
            as: "Employee",
            attributes: ["id", "full_name"],
          },
        ],
      },
    ];

    if (employee_id) {
      include[2].where = { employee_id };
      include[2].required = true;
    }

    const session = await Session.findOne({
      where,
      include,
      order: [["actual_start_at", "DESC"]],
    });

    if (!session) return null;

    const plain = session.get({ plain: true });
    return {
      ...plain,
      id: plain.id,
      session_id: plain.id,
    };
  }

  static async activateSession({
    tiktok_channel_id,
    initial_revenue,
    screenshot_url,
  }) {
    const transaction = await sequelize.transaction();

    try {
      const channel = await Channel.findOne({
        where: { tiktok_channel_id },
        transaction,
      });

      if (!channel) throw { status: 404, message: "Channel not found" };

      const now1 = new Date();

      // Tính thời gian cho phép bắt đầu sớm (20 phút trước start_at)
      const twentyMinutesInMs = 20 * 60 * 1000; // 20 phút = 1,200,000 ms
      
      // Tính ngày hôm nay (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Tính ngày mai (00:00:00)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Xây dựng điều kiện where
      const eventWhere = {
        channel_id: channel.id,        // 1. Theo channel_id
        is_active: true,               // 2. is_active = true
        
        // 3. Thời gian hiện tại nằm trong khoảng (start_at - 20 phút) và end_at
        // Cho phép bắt đầu sớm 20 phút trước start_at
        start_at: { 
          [Op.lte]: new Date(now1.getTime() + twentyMinutesInMs)  // start_at <= (now + 20 phút)
        },
        end_at: { 
          [Op.gte]: now1  // end_at >= now (chưa kết thúc)
        },
        
        // 4. Ngày hiện tại (start_at hoặc end_at nằm trong ngày hôm nay)
        [Op.or]: [
          {
            start_at: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          },
          {
            end_at: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          }
        ]
      };

      const event = await Event.findOne({
        where: eventWhere,
        include: [
          {
            model: EventMember,
            as: "members",
            include: [
              {
                model: Employee,
                as: "employee",
                attributes: ["id", "full_name"],
              },
            ],
          },
        ],
        transaction,
      });

      if (!event) throw { status: 404, message: "No active shift" };

      const existingSession = await Session.findOne({
        where: { event_id: event.id, is_active: true, status: "ACTIVE" },
        transaction,
      });

      if (existingSession) {
        throw {
          status: 400,
          message: `Shift already activated at ${existingSession.actual_start_at}`,
        };
      }

      const now = new Date();
      const start = toUtcFromDbLocal(event.start_at);
      const end = toUtcFromDbLocal(event.end_at);

      const earliestAllowed = new Date(start.getTime() - 30 * 60 * 1000);

      if (now < earliestAllowed) {
        const diffMs = earliestAllowed.getTime() - now.getTime();
        const minutes = Math.ceil(diffMs / 60000);
        throw {
          status: 400,
          message: `Too early to activate. Please wait ${minutes} minutes.`,
        };
      }

      if (now > end) {
        throw { status: 400, message: "Shift already ended, cannot activate" };
      }

      const newSession = await Session.create(
        {
          event_id: event.id,
          schedule_id: event.schedule_id,
          channel_id: channel.id,
          start_at: start,
          end_at: end,
          revenue_enabled_snap: !!event.revenue_enabled,
          actual_start_at: now,
          actual_end_at: null,
          revenue_start: initial_revenue,
          revenue_end: null,
          screenshot_start_url: screenshot_url,
          late_flag: 0,
          is_active: true,
          status: "ACTIVE",
        },
        { transaction }
      );

      const staffRecords = event.members.map((m) => ({
        session_id: newSession.id,
        employee_id: m.employee_id,
        role: m.role,
      }));

      await SessionStaff.bulkCreate(staffRecords, { transaction });

      // Mark the event as no longer active once a session is started
      await event.update({ is_active: false }, { transaction });

      await transaction.commit();
      
      return {
        id: newSession.id,
        session_id: newSession.id,
        event_id: event.id,
        channel_id: channel.id,
        channel_name: channel.name,
        tiktok_channel_id: channel.tiktok_channel_id,
        start_at: newSession.start_at,
        end_at: newSession.end_at,
        actual_start_at: newSession.actual_start_at,
        revenue_start: newSession.revenue_start,
        revenue_tracking_enabled: newSession.revenue_enabled_snap,
        screenshot_start_url: screenshot_url,
        screenshot_end_url: null,
        status: newSession.status,
        is_active: newSession.is_active,
        staff: staffRecords.map((s) => {
          const em = event.members.find((m) => m.employee_id === s.employee_id);
          return {
            employee_id: s.employee_id,
            name: em?.employee?.full_name || "",
            role: s.role,
          };
        }),
      };
    } catch (err) {
      await transaction.rollback();

      if (!err.status) {
        console.error("Unexpected error in activateSession:", err);
        throw { status: 500, message: "Internal server error" };
      }
      throw err;
    }
  }

  // Update session (actual time / revenue)
  static async updateSession(sessionId, body) {
    const session = await Session.findByPk(sessionId);
    if (!session) {
      throw { status: 404, message: "Session not found" };
    }

    const patch = {};
    const fields = [
      "actual_start_at",
      "actual_end_at",
      "total_hours",
      "revenue_start",
      "revenue_end",
      "revenue_total",
      "total_revenue", // alias from FE
      "screenshot_url",
      "screenshot_start_url",
      "screenshot_end_url",
      "late_flag",
      "status",
    ];
    fields.forEach((f) => {
      if (body[f] !== undefined) patch[f] = body[f];
    });

    // Backward compatibility: if only screenshot_url is sent, treat it as start screenshot
    if (patch.screenshot_url && !patch.screenshot_start_url) {
      patch.screenshot_start_url = patch.screenshot_url;
    }

    if (patch.total_hours !== undefined) {
      const hours = parseFloat(patch.total_hours);
      if (!Number.isNaN(hours)) {
        patch.total_hours = parseFloat(hours.toFixed(2));
        patch.total_seconds = Math.round(hours * 3600);
      } else {
        delete patch.total_hours;
      }
    }

    if (
      (patch.revenue_start !== undefined || body.revenue_start !== undefined) &&
      (patch.revenue_end !== undefined || body.revenue_end !== undefined) &&
      patch.revenue_total === undefined
    ) {
      const start = patch.revenue_start ?? session.revenue_start ?? 0;
      const end = patch.revenue_end ?? session.revenue_end ?? 0;
      patch.revenue_total = parseFloat((end - start).toFixed(2));
    }

    if (patch.total_revenue !== undefined && patch.revenue_total === undefined) {
      patch.revenue_total = patch.total_revenue;
      delete patch.total_revenue;
    }

    await session.update(patch);
    return session.reload();
  }

  // L\u1ecbch s\u1eed ch\u1ea5m c\u00f4ng theo nh\u00e2n vi\u00ean \u0111ang \u0111\u0103ng nh\u1eadp
  static async getEmployeeHistory({ employeeId, from, to, page = 1, pageSize = 20 }) {
    if (!employeeId) {
      throw { status: 400, message: "employeeId is required" };
    }

    const startField = fn(
      "COALESCE",
      col("Session.actual_start_at"),
      col("Session.start_at")
    );

    const fromDate = from ? dayjs(from).startOf("day").toDate() : null;
    const toDate = to ? dayjs(to).endOf("day").toDate() : null;

    const filters = [];
    if (fromDate || toDate) {
      const range = {};
      if (fromDate) range[Op.gte] = fromDate;
      if (toDate) range[Op.lte] = toDate;
      filters.push(where(startField, range));
    }

    const whereClause = {};
    if (filters.length) whereClause[Op.and] = filters;

    const pageNum = Number(page) || 1;
    const sizeNum = Number(pageSize) || 20;

    const { rows, count } = await Session.findAndCountAll({
      where: whereClause,
      distinct: true,
      include: [
        {
          model: SessionStaff,
          as: "staff",
          attributes: ["employee_id", "role"],
          where: { employee_id: employeeId },
          required: true,
        },
        {
          model: Channel,
          as: "channel",
          attributes: ["id", "name", "tiktok_channel_id"],
          required: false,
        },
      ],
      order: [[startField, "DESC"]],
      offset: (pageNum - 1) * sizeNum,
      limit: sizeNum,
    });

    const items = rows.map((session) => {
      const plain = session.get({ plain: true });
      const start = plain.actual_start_at || plain.start_at;
      const end = plain.actual_end_at || plain.end_at;

      let totalHours =
        plain.total_hours === null || plain.total_hours === undefined
          ? null
          : parseFloat(plain.total_hours);
      if (totalHours === null && start && end) {
        const seconds = Math.max(0, dayjs(end).diff(dayjs(start), "second"));
        totalHours = parseFloat((seconds / 3600).toFixed(2));
      }

      const revenueStart =
        plain.revenue_start !== null && plain.revenue_start !== undefined
          ? parseFloat(plain.revenue_start)
          : null;
      const revenueEnd =
        plain.revenue_end !== null && plain.revenue_end !== undefined
          ? parseFloat(plain.revenue_end)
          : null;
      let revenueTotal =
        plain.revenue_total !== null && plain.revenue_total !== undefined
          ? parseFloat(plain.revenue_total)
          : null;
      if (revenueTotal === null && revenueEnd !== null && revenueStart !== null) {
        revenueTotal = parseFloat((revenueEnd - revenueStart).toFixed(2));
      }

      return {
        session_id: plain.id,
        channel_id: plain.channel_id,
        channel_name: plain.channel?.name || null,
        tiktok_channel_id: plain.channel?.tiktok_channel_id || null,
        start_at: plain.start_at,
        end_at: plain.end_at,
        actual_start_at: plain.actual_start_at,
        actual_end_at: plain.actual_end_at,
        total_hours: totalHours,
        revenue_start: revenueStart,
        revenue_end: revenueEnd,
        revenue_total: revenueTotal,
        status: plain.status,
        role: plain.staff?.[0]?.role || null,
        is_active: plain.is_active,
      };
    });

    return {
      items,
      pagination: {
        page: pageNum,
        pageSize: sizeNum,
        total: count,
      },
    };
  }

  static async stopSession(sessionId, finalRevenue, screenshotUrl) {
    const transaction = await sequelize.transaction();
    try {
      if (!Number.isFinite(sessionId)) {
        throw { status: 400, message: "session_id is invalid" };
      }

      const session = await Session.findByPk(sessionId, { transaction });

      if (!session) {
        throw {
          status: 404,
          message: "Session not found",
        };
      }

      if (session.status !== "ACTIVE") {
        throw {
          status: 400,
          message: "Session already ended",
        };
      }

      if (!session.is_active) {
        throw {
          status: 400,
          message: "Session is not active",
        };
      }

      if (finalRevenue === undefined || finalRevenue === null) {
        throw {
          status: 400,
          message: "final_revenue is required when stopping a session",
        };
      }

      const now = new Date();
      const startTime = session.actual_start_at || session.start_at;
      if (!startTime) {
        throw { status: 400, message: "Missing start time to compute duration" };
      }

      session.status = "ENDED";
      session.actual_end_at = now;
      session.is_active = false;

      const durationSeconds = Math.max(
        0,
        Math.round(dayjs(now).diff(dayjs(startTime), "second"))
      );
      const durationHours = parseFloat((durationSeconds / 3600).toFixed(2));
      session.total_seconds = durationSeconds;
      session.total_hours = durationHours;

      session.revenue_end = finalRevenue;
      session.revenue_total = parseFloat(
        (session.revenue_end - (session.revenue_start || 0)).toFixed(2)
      );
      if (screenshotUrl) {
        session.screenshot_end_url = screenshotUrl;
      }

      await session.save({ transaction });

      // Mark the related event as active again
      if (session.event_id) {
        await Event.update(
          { is_active: true },
          { where: { id: session.event_id }, transaction }
        );
      }

      await transaction.commit();

      await session.reload();

      return {
        success: true,
        data: {
          session_id: session.id,
          status: session.status,
          is_active: session.is_active,
          actual_start_at: session.actual_start_at,
          actual_end_at: session.actual_end_at,
          total_seconds: session.total_seconds,
          total_hours: session.total_hours,
          revenue_start: session.revenue_start,
          revenue_end: session.revenue_end,
          revenue_total: session.revenue_total,
          screenshot_url: session.screenshot_end_url, // backward compatibility
          screenshot_start_url: session.screenshot_start_url,
          screenshot_end_url: session.screenshot_end_url,
        },
      };
    } catch (error) {
      console.error("Error stopping session:", error);
      try {
        if (!transaction.finished) {
          await transaction.rollback();
        }
      } catch (_) {}
      throw error;
    }
  }
}

module.exports = SessionService;
