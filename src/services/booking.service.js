// services/booking.service.js
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const {
  BookingConfig,
  BookingConfigSlot,
  Booking,
  BookingStatusLog,
  Channel,
} = require("../models");
const moment = require("moment-timezone");

class BookingService {
  // ============ PUBLIC API ============

  async resolveChannel(token) {
    const config = await BookingConfig.findOne({
      where: { public_token: token, is_active: true }, // ✅ snake_case
      include: [
        {
          model: Channel,
          as: "channel",
          attributes: ["id", "name"],
        },
        {
          model: BookingConfigSlot,
          as: "slots",
          attributes: ["weekday", "start_time", "end_time"], // ✅ snake_case
        },
      ],
    });

    if (!config) {
      throw {
        status: 404,
        error: "CHANNEL_NOT_FOUND",
        message: "Không tìm thấy kênh hoặc kênh đã bị vô hiệu hóa",
      };
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    const publicLink = `${baseUrl}/booking?token=${config.public_token}`;

    return {
      channel_id: config.channel_id, // ✅ snake_case
      name: config.channel.name,
      booking_config: {
        slots: config.slots.map((s) => ({
          weekday: s.weekday,
          start: s.start_time, // ✅ snake_case
          end: s.end_time, // ✅ snake_case
        })),
        min_duration_minutes: config.min_duration_minutes, // ✅ snake_case
        max_duration_minutes: config.max_duration_minutes, // ✅ snake_case
      },
      public_link: publicLink,
      public_token: config.public_token,
    };
  }

  async getPublicBookings(channelId, from, to) {
    const where = {
      channel_id: channelId,
      status: { [Op.in]: ["PENDING", "APPROVED"] },
    };
    if (from) where.start_at = { [Op.gte]: from };
    if (to) where.end_at = Object.assign(where.end_at || {}, { [Op.lte]: to });

    const bookings = await Booking.findAll({
      where,
      attributes: ["id", "start_at", "end_at", "status", "full_name"],
      order: [["start_at", "ASC"]],
    });

    return bookings.map((b) => ({
      id: b.id,
      start_at: b.start_at,
      end_at: b.end_at,
      status: b.status,
      full_name: b.full_name,
    }));
  }

  async createPublicBooking(data) {
    const { channel_id, start_at, end_at, full_name, phone, note } = data;

    // 1. Lấy config
    const config = await BookingConfig.findOne({
      where: { channel_id: channel_id, is_active: true },
      include: [{ model: BookingConfigSlot, as: "slots" }],
    });

    if (!config) {
      throw {
        status: 404,
        error: "CONFIG_NOT_FOUND",
        message: "Kênh chưa được cấu hình booking",
      };
    }

    // 2. Validate duration
    const startMoment = moment(start_at).tz("Asia/Ho_Chi_Minh");
    const endMoment = moment(end_at).tz("Asia/Ho_Chi_Minh");
    const durationMinutes = endMoment.diff(startMoment, "minutes");

    if (
      durationMinutes < config.min_duration_minutes ||
      durationMinutes > config.max_duration_minutes
    ) {
      throw {
        status: 400,
        error: "INVALID_DURATION",
        message: `Thời lượng phải từ ${config.min_duration_minutes}-${config.max_duration_minutes} phút`,
        details: {
          min: config.min_duration_minutes,
          max: config.max_duration_minutes,
          requested: durationMinutes,
        },
      };
    }

    // 3. Validate slot
    const weekday = startMoment.isoWeekday();
    const startTime = startMoment.format("HH:mm:ss");
    const endTime = endMoment.format("HH:mm:ss");

    const validSlot = config.slots.find(
      (s) =>
        s.weekday === weekday &&
        startTime >= s.start_time &&
        endTime <= s.end_time
    );

    if (!validSlot) {
      throw {
        status: 400,
        error: "INVALID_TIME_SLOT",
        message: "Khung giờ không hợp lệ hoặc không nằm trong lịch làm việc",
        details: { weekday, startTime, endTime },
      };
    }

    // 4. Check overlap
    const transaction = await sequelize.transaction();
    try {
      const overlapping = await Booking.findOne({
        where: {
          channel_id: channel_id,
          status: { [Op.in]: ["PENDING", "APPROVED"] },
          [Op.or]: [
            {
              start_at: { [Op.lt]: end_at },
              end_at: { [Op.gt]: start_at },
            },
          ],
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (overlapping) {
        await transaction.rollback();
        throw {
          status: 409,
          error: "TIME_SLOT_TAKEN",
          message: "Khung giờ này đã có người đặt",
          conflicting_bookings: [
            {
              id: overlapping.id,
              start_at: overlapping.start_at,
              end_at: overlapping.end_at,
              status: overlapping.status,
            },
          ],
        };
      }

      // 5. Create booking (NO booking_token)
      const crypto = require("crypto");
      const bookingToken = crypto.randomBytes(24).toString("hex");

      const booking = await Booking.create(
        {
          channel_id,
          booking_config_id: config.id,
          start_at,
          end_at,
          status: "PENDING",
          full_name,
          phone,
          note,
          booking_token: bookingToken,
        },
        { transaction }
      );

      // 6. Log status
      await BookingStatusLog.create(
        {
          booking_id: booking.id,
          status: "PENDING",
          note: "Booking được tạo",
        },
        { transaction }
      );

      await transaction.commit();

      return {
        id: booking.id,
        channel_id: booking.channel_id,
        start_at: booking.start_at,
        end_at: booking.end_at,
        status: booking.status,
        full_name: booking.full_name,
        phone: booking.phone,
        note: booking.note,
        booking_token: booking.booking_token,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getPublicBookingById(id, token) {
    const booking = await Booking.findOne({
      where: { id, booking_token: token }, // ✅ snake_case
      attributes: [
        "id",
        "channel_id", // ✅ snake_case
        "start_at", // ✅ snake_case
        "end_at", // ✅ snake_case
        "status",
        "full_name", // ✅ snake_case
        "phone",
        "note",
        "created_at", // ✅ snake_case
      ],
    });

    if (!booking) {
      throw {
        status: 404,
        error: "BOOKING_NOT_FOUND",
        message: "Không tìm thấy booking hoặc token không hợp lệ",
      };
    }

    return {
      id: booking.id,
      channel_id: booking.channel_id, // ✅ snake_case
      start_at: booking.start_at, // ✅ snake_case
      end_at: booking.end_at, // ✅ snake_case
      status: booking.status,
      full_name: booking.full_name, // ✅ snake_case
      phone: booking.phone,
      note: booking.note,
      created_at: booking.created_at, // ✅ snake_case
    };
  }

  async cancelPublicBooking(id, token) {
    const booking = await Booking.findOne({
      where: { id, booking_token: token }, // ✅ snake_case
    });

    if (!booking) {
      throw {
        status: 404,
        error: "BOOKING_NOT_FOUND",
        message: "Không tìm thấy booking hoặc token không hợp lệ",
      };
    }

    if (!["PENDING", "APPROVED"].includes(booking.status)) {
      throw {
        status: 409,
        error: "INVALID_STATUS",
        message: `Không thể hủy booking ở trạng thái ${booking.status}`,
      };
    }

    const transaction = await sequelize.transaction();
    try {
      await booking.update({ status: "CANCELLED" }, { transaction });

      await BookingStatusLog.create(
        {
          booking_id: booking.id, // ✅ snake_case
          status: "CANCELLED",
          note: "Khách hàng tự hủy",
        },
        { transaction }
      );

      await transaction.commit();

      return {
        id: booking.id,
        status: booking.status,
        message: "Đã hủy booking thành công",
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // ============ ADMIN CONFIG ============

  async getBookingConfig(channelId) {
    const config = await BookingConfig.findOne({
      where: { channel_id: channelId }, // ✅ snake_case
      include: [{ model: BookingConfigSlot, as: "slots" }],
    });

    if (!config) {
      throw {
        status: 404,
        error: "CONFIG_NOT_FOUND",
        message: "Kênh chưa được cấu hình booking",
      };
    }

    const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
    const publicLink = `${baseUrl}/booking?token=${config.public_token}`; // ✅ snake_case

    return {
      id: config.id,
      channel_id: config.channel_id, // ✅ snake_case
      public_link: publicLink,
      public_token: config.public_token, // ✅ snake_case
      min_duration_minutes: config.min_duration_minutes, // ✅ snake_case
      max_duration_minutes: config.max_duration_minutes, // ✅ snake_case
      is_active: config.is_active, // ✅ snake_case
      slots: config.slots.map((s) => ({
        weekday: s.weekday,
        start: s.start_time, // ✅ snake_case
        end: s.end_time, // ✅ snake_case
      })),
    };
  }

  async updateBookingConfig(channelId, data, userId) {
    const {
      slots,
      min_duration_minutes,
      max_duration_minutes,
      is_active,
      public_token,
    } = data;

    // 1. Validate slots không overlap
    this._validateSlots(slots);
    const normalizeTime = (t) => {
      if (!t) return t;
      // Chấp nhận HH:mm hoặc HH:mm:ss
      if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
      return t;
    };

    const transaction = await sequelize.transaction();
    try {
      let config = await BookingConfig.findOne({
        where: { channel_id: channelId }, // ✅ snake_case
        transaction,
      });

      const crypto = require("crypto");
      const generateToken = () =>
        "pub_" + crypto.randomBytes(16).toString("hex");

      if (!config) {
        // Tạo mới config
        config = await BookingConfig.create(
          {
            channel_id: channelId, // ✅ snake_case
            public_token: public_token || generateToken(), // ✅ snake_case
            min_duration_minutes: min_duration_minutes, // ✅ snake_case
            max_duration_minutes: max_duration_minutes, // ✅ snake_case
            is_active: is_active !== undefined ? is_active : true, // ✅ snake_case
            created_by: userId, // ✅ snake_case
          },
          { transaction }
        );
      } else {
        // Update config
        await config.update(
          {
            min_duration_minutes: min_duration_minutes, // ✅ snake_case
            max_duration_minutes: max_duration_minutes, // ✅ snake_case
            is_active: is_active !== undefined ? is_active : config.is_active, // ✅ snake_case
            public_token: public_token || config.public_token,
          },
          { transaction }
        );
      }

      // 2. Xóa slots cũ và tạo mới
      await BookingConfigSlot.destroy({
        where: { booking_config_id: config.id }, // ✅ snake_case
        transaction,
      });

      await BookingConfigSlot.bulkCreate(
        slots.map((s) => ({
          booking_config_id: config.id, // ✅ snake_case
          weekday: s.weekday,
          start_time: normalizeTime(s.start), // ✅ snake_case
          end_time: normalizeTime(s.end), // ✅ snake_case
        })),
        { transaction }
      );

      await transaction.commit();

      const baseUrl = process.env.PUBLIC_BASE_URL || "http://localhost:3000";
      const publicLink = `${baseUrl}/booking?token=${config.public_token}`; // ✅ snake_case

      return {
        id: config.id,
        channel_id: config.channel_id, // ✅ snake_case
        public_link: publicLink,
        public_token: config.public_token, // ✅ snake_case
        message: "Cập nhật cấu hình thành công",
        min_duration_minutes: config.min_duration_minutes,
        max_duration_minutes: config.max_duration_minutes,
        is_active: config.is_active,
        slots: slots.map((s) => ({
          weekday: s.weekday,
          start: s.start,
          end: s.end,
        })),
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  _validateSlots(slots) {
    const byWeekday = {};
    slots.forEach((s) => {
      if (!byWeekday[s.weekday]) byWeekday[s.weekday] = [];
      byWeekday[s.weekday].push(s);
    });

    for (const [weekday, daySlots] of Object.entries(byWeekday)) {
      for (let i = 0; i < daySlots.length; i++) {
        for (let j = i + 1; j < daySlots.length; j++) {
          const a = daySlots[i];
          const b = daySlots[j];
          if (a.start < b.end && b.start < a.end) {
            throw {
              status: 400,
              error: "OVERLAPPING_SLOTS",
              message: `Các slot trong ngày ${weekday} bị chồng lấn`,
              details: { slot1: a, slot2: b },
            };
          }
        }
      }
    }
  }

  async getAdminBookings(filters) {
    const { status, channel_id, from, to, page, pageSize } = filters;

    const where = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (channel_id) {
      where.channel_id = channel_id; // ✅ snake_case
    }
    if (from) where.start_at = { [Op.gte]: from }; // ✅ snake_case
    if (to) where.end_at = Object.assign(where.end_at || {}, { [Op.lte]: to }); // ✅ snake_case

    const offset = (page - 1) * pageSize;

    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["created_at", "DESC"]], // ✅ snake_case
      include: [
        {
          model: Channel,
          as: "channel",
          attributes: ["id", "name"],
        },
      ],
    });

    return {
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      data: rows.map((b) => ({
        id: b.id,
        channel_id: b.channel_id, // ✅ snake_case
        channel_name: b.channel?.name,
        start_at: b.start_at, // ✅ snake_case
        end_at: b.end_at, // ✅ snake_case
        status: b.status,
        full_name: b.full_name, // ✅ snake_case
        phone: b.phone,
        note: b.note,
        created_at: b.created_at, // ✅ snake_case
      })),
    };
  }

  async getAdminBookingById(id) {
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Channel,
          as: "channel",
          attributes: ["id", "name"],
        },
        {
          model: BookingStatusLog,
          as: "statusLogs",
          order: [["created_at", "DESC"]], // ✅ snake_case
        },
      ],
    });

    if (!booking) {
      throw {
        status: 404,
        error: "BOOKING_NOT_FOUND",
        message: "Không tìm thấy booking",
      };
    }

    return {
      id: booking.id,
      channel_id: booking.channel_id, // ✅ snake_case
      channel_name: booking.channel?.name,
      start_at: booking.start_at, // ✅ snake_case
      end_at: booking.end_at, // ✅ snake_case
      status: booking.status,
      full_name: booking.full_name, // ✅ snake_case
      phone: booking.phone,
      note: booking.note,
      created_at: booking.created_at, // ✅ snake_case
      updated_at: booking.updated_at, // ✅ snake_case
      status_logs: booking.statusLogs.map((log) => ({
        status: log.status,
        note: log.note,
        created_by: log.created_by, // ✅ snake_case
        created_at: log.created_at, // ✅ snake_case
      })),
    };
  }

  async approveBooking(id, userId, note) {
    return this._changeBookingStatus(id, "APPROVED", userId, note);
  }

  async rejectBooking(id, userId, note) {
    return this._changeBookingStatus(id, "REJECTED", userId, note);
  }

  async cancelBooking(id, userId, note) {
    return this._changeBookingStatus(id, "CANCELLED", userId, note);
  }

  async _changeBookingStatus(id, newStatus, userId, note) {
    const booking = await Booking.findByPk(id);

    if (!booking) {
      throw {
        status: 404,
        error: "BOOKING_NOT_FOUND",
        message: "Không tìm thấy booking",
      };
    }

    // Validate transition
    const validTransitions = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["CANCELLED"],
      REJECTED: [],
      CANCELLED: [],
    };

    if (!validTransitions[booking.status]?.includes(newStatus)) {
      throw {
        status: 409,
        error: "INVALID_TRANSITION",
        message: `Không thể chuyển từ ${booking.status} sang ${newStatus}`,
      };
    }

    // Nếu approve, check overlap lại
    if (newStatus === "APPROVED") {
      const overlapping = await Booking.findOne({
        where: {
          channel_id: booking.channel_id, // ✅ snake_case
          status: { [Op.in]: ["PENDING", "APPROVED"] },
          id: { [Op.ne]: id },
          [Op.or]: [
            {
              start_at: { [Op.lt]: booking.end_at }, // ✅ snake_case
              end_at: { [Op.gt]: booking.start_at }, // ✅ snake_case
            },
          ],
        },
      });

      if (overlapping) {
        throw {
          status: 409,
          error: "TIME_SLOT_TAKEN",
          message: "Khung giờ này đã có booking khác được duyệt",
          conflicting_bookings: [
            {
              id: overlapping.id,
              start_at: overlapping.start_at, // ✅ snake_case
              end_at: overlapping.end_at, // ✅ snake_case
              status: overlapping.status,
            },
          ],
        };
      }
    }

    const transaction = await sequelize.transaction();
    try {
      await booking.update({ status: newStatus }, { transaction });

      await BookingStatusLog.create(
        {
          booking_id: booking.id, // ✅ snake_case
          status: newStatus,
          note: note || `Booking được ${newStatus.toLowerCase()}`,
          created_by: userId, // ✅ snake_case
        },
        { transaction }
      );

      await transaction.commit();

      return {
        id: booking.id,
        status: booking.status,
        message: `Đã ${newStatus.toLowerCase()} booking thành công`,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new BookingService();
