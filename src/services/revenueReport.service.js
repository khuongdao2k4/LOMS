"use strict";

const ExcelJS = require("exceljs");
const dayjs = require("dayjs");
const { Op, Sequelize } = require("sequelize");
const { RevenueReport, Channel, Session, sequelize } = require("../models");

const ALLOWED_TYPES = ["NETWORK", "CHANNEL", "EMPLOYEE"];
const ALLOWED_SECTIONS = ["DAILY", "MONTHLY", "YEARLY"];
const NETWORK_VALUE_ID = 0;
const normalizeValueId = (type, valueId) => (type === "NETWORK" ? NETWORK_VALUE_ID : valueId);
const toDbValueId = (type, valueId) => (type === "NETWORK" ? null : valueId);

class RevenueReportService {
  /**
   * Upsert 1 bản ghi revenue_reports theo (type, section, value_id, date_value).
   * Dùng khi cập nhật doanh thu phiên hoặc trong job tổng hợp.
   */
  static async upsertRevenueReport({
    type,
    section,
    valueId = null,
    dateValue,
    totalRevenue = 0,
    totalHours = 0,
    transaction,
  }) {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new Error("Invalid revenue report type");
    }
    if (!ALLOWED_SECTIONS.includes(section)) {
      throw new Error("Invalid revenue report section");
    }
    if (!dateValue) {
      throw new Error("dateValue is required");
    }

    const dbValueId = toDbValueId(type, valueId);

    const t = transaction || (await sequelize.transaction());
    try {
      // Với NETWORK (value_id IS NULL), unique index không chặn trùng, nên dùng find + update để tránh sinh thêm dòng
      if (type === "NETWORK") {
        const existing = await RevenueReport.findOne({
          where: { type, section, value_id: { [Op.is]: null }, date_value: dateValue },
          transaction: t,
          lock: transaction ? t.LOCK.UPDATE : undefined,
        });
        if (existing) {
          await existing.update(
            {
              total_revenue: parseFloat(totalRevenue.toFixed(2)),
              total_hours: parseFloat(totalHours.toFixed(2)),
            },
            { transaction: t }
          );
        } else {
          await RevenueReport.create(
            {
              type,
              section,
              value_id: null,
              date_value: dateValue,
              total_revenue: parseFloat(totalRevenue.toFixed(2)),
              total_hours: parseFloat(totalHours.toFixed(2)),
            },
            { transaction: t }
          );
        }
      } else {
        await RevenueReport.upsert(
          {
            type,
            section,
            value_id: dbValueId,
            date_value: dateValue,
            total_revenue: parseFloat(totalRevenue.toFixed(2)),
            total_hours: parseFloat(totalHours.toFixed(2)),
          },
          { transaction: t, returning: false }
        );
      }

      if (!transaction) await t.commit();
      return true;
    } catch (err) {
      if (!transaction) await t.rollback();
      throw err;
    }
  }

  /**
   * Lấy danh sách báo cáo (aggregate hoặc detail).
   * detail=aggregate (default): gom theo date/month; detail=session: trả từng phiên.
   */
  static async list({
    from,
    to,
    type = "NETWORK",
    section = "DAILY",
    value_id,
    detail = "aggregate",
    page = 1,
    page_size = 20,
    sort_by = "date_value",
    sort_dir = "DESC",
    group_by_channel = false,
  }) {
    const fromDate = from ? dayjs(from).startOf("day").toDate() : null;
    const toDate = to ? dayjs(to).endOf("day").toDate() : null;
    const effectiveType = type === "NETWORK" && group_by_channel ? "CHANNEL" : type;
    const normalizedValueId = normalizeValueId(effectiveType, value_id);

    // Detail mode: trả từng phiên
    if (detail === "session") {
      const whereSession = {};
      if (fromDate || toDate) {
        whereSession.actual_start_at = {};
        if (fromDate) whereSession.actual_start_at[Op.gte] = fromDate;
        if (toDate) whereSession.actual_start_at[Op.lte] = toDate;
      }
      if (type === "CHANNEL" && value_id) {
        whereSession.channel_id = value_id;
      }
      whereSession.status = "ENDED";

      const sessions = await Session.findAll({
        where: whereSession,
        include: [{ model: Channel, as: "channel", attributes: ["id", "name"], required: false }],
        order: [["actual_start_at", sort_dir]],
      });

      const rows = sessions.map((s) => {
        const start = s.actual_start_at || s.start_at;
        const end = s.actual_end_at || s.end_at;
        return {
          session_id: s.id,
          channel_id: s.channel_id,
          channel_name: s.channel?.name || null,
          date_value: start ? dayjs(start).format("YYYY-MM-DD") : null,
          start_at: start,
          end_at: end,
          actual_start_at: s.actual_start_at,
          actual_end_at: s.actual_end_at,
          total_hours: s.total_hours !== null ? parseFloat(s.total_hours) : null,
          total_revenue: s.revenue_total !== null ? parseFloat(s.revenue_total) : null,
          total_sessions: 1,
        };
      });

      const summary = rows.reduce(
        (acc, r) => {
          acc.total_hours += r.total_hours || 0;
          acc.total_revenue += r.total_revenue || 0;
          acc.total_sessions += 1;
          return acc;
        },
        { total_hours: 0, total_revenue: 0, total_sessions: 0 }
      );

      return {
        data: rows,
        pagination: { page: 1, page_size: rows.length, total: rows.length },
        summary: {
          total_revenue: parseFloat(summary.total_revenue.toFixed(2)),
          total_hours: parseFloat(summary.total_hours.toFixed(2)),
          total_sessions: summary.total_sessions,
        },
      };
    }

    // Aggregate mode
    const viewSection = section; // what the client wants to see
    const dataSection = section === "YEARLY" ? "MONTHLY" : section; // use monthly data to render yearly view

    const where = { section: dataSection, type: effectiveType };
    if (effectiveType === "NETWORK") {
      where.value_id = { [Op.or]: [NETWORK_VALUE_ID, null] };
    } else if (value_id !== undefined) {
      where.value_id = normalizeValueId(effectiveType, value_id);
    }
    if (fromDate || toDate) {
      where.date_value = {};
      if (fromDate) where.date_value[Op.gte] = dayjs(fromDate).format("YYYY-MM-DD");
      if (toDate) where.date_value[Op.lte] = dayjs(toDate).format("YYYY-MM-DD");
    }

    const include =
      effectiveType === "CHANNEL"
        ? [{ model: Channel, as: "channel", attributes: ["id", "name"], required: false }]
        : [];

    // Lấy revenue_reports
    const reports = await RevenueReport.findAll({
      where,
      include,
      order: [[sort_by, sort_dir]],
      raw: false,
    });
    const mergedReports = new Map();
    reports.forEach((r) => {
      const json = r.toJSON ? r.toJSON() : r;
      const normalizedId = normalizeValueId(json.type, json.value_id);
      const dateKey = dayjs(json.date_value).format("YYYY-MM-DD");
      const key = `${json.type}-${normalizedId ?? "NULL"}-${dateKey}`;
      const payload = { ...json, value_id: json.type === "NETWORK" ? null : normalizedId };
      const existing = mergedReports.get(key);
      if (!existing) {
        mergedReports.set(key, payload);
        return;
      }
      const existingTime = existing.created_at ? dayjs(existing.created_at).valueOf() : 0;
      const payloadTime = payload.created_at ? dayjs(payload.created_at).valueOf() : 0;
      if (payloadTime >= existingTime) {
        mergedReports.set(key, payload);
      }
    });
    const normalizedReports = Array.from(mergedReports.values());

    // Đếm số ca từ sessions để có total_sessions
    const sessionWhere = {};
    if (fromDate || toDate) {
      sessionWhere.actual_start_at = {};
      if (fromDate) sessionWhere.actual_start_at[Op.gte] = fromDate;
      if (toDate) sessionWhere.actual_start_at[Op.lte] = toDate;
    }
    if (effectiveType === "CHANNEL" && !group_by_channel && value_id) {
      sessionWhere.channel_id = value_id;
    }

    // Group theo date hoặc month tùy section
    const groupExpression =
      viewSection === "YEARLY"
        ? sequelize.literal(`to_char(actual_start_at, 'YYYY-MM')`)
        : sequelize.fn("DATE", sequelize.col("actual_start_at"));

    const sessionAttributes = [
      [groupExpression, "bucket"],
      [sequelize.fn("COUNT", sequelize.col("id")), "total_sessions"],
    ];
    if (effectiveType === "CHANNEL" && group_by_channel) {
      sessionAttributes.push(["channel_id", "channel_id"]);
    }

    const sessionGroup = ["bucket"];
    if (effectiveType === "CHANNEL" && group_by_channel) {
      sessionGroup.push("channel_id");
    }

    const sessionCounts = await Session.findAll({
      where: sessionWhere,
      attributes: sessionAttributes,
      group: sessionGroup,
      raw: true,
    });
    const sessionMap = sessionCounts.reduce((acc, cur) => {
      const key =
        effectiveType === "CHANNEL" && group_by_channel
          ? `${cur.channel_id ?? "NULL"}-${cur.bucket}`
          : cur.bucket;
      acc[key] = parseInt(cur.total_sessions, 10);
      return acc;
    }, {});

    // Build rows theo bucket (date hoặc month)
    const rows = normalizedReports.map((r) => {
      const json = r.toJSON ? r.toJSON() : r;
      const normalizedId = normalizeValueId(json.type, json.value_id);
      const bucket =
        viewSection === "YEARLY"
          ? dayjs(json.date_value).format("YYYY-MM")
          : dayjs(json.date_value).format("YYYY-MM-DD");
      const sessionKey =
        effectiveType === "CHANNEL" && group_by_channel
          ? `${normalizedId ?? json.channel_id ?? "NULL"}-${bucket}`
          : bucket;
      return {
        ...json,
        type: json.type,
        section: viewSection,
        date_value: bucket,
        value_id: json.type === "NETWORK" ? null : normalizedId,
        channel_name: json.channel?.name || json.channel_name || null,
        total_sessions: sessionMap[sessionKey] || 0,
      };
    });

    // Nếu section=YEARLY cần gộp theo month
    let aggregatedRows = rows;
    if (viewSection === "YEARLY") {
      const agg = {};
      rows.forEach((r) => {
        const key = `${r.type}-${normalizeValueId(r.type, r.value_id) ?? "ALL"}-${r.date_value}`;
        if (!agg[key]) {
          agg[key] = {
            type: r.type,
            section: "YEARLY",
            value_id: r.value_id,
            date_value: r.date_value, // YYYY-MM
            channel_name: r.channel_name,
            total_revenue: 0,
            total_hours: 0,
            total_sessions: 0,
          };
        }
        agg[key].total_revenue += parseFloat(r.total_revenue);
        agg[key].total_hours += parseFloat(r.total_hours);
        agg[key].total_sessions += r.total_sessions || 0;
      });
      aggregatedRows = Object.values(agg).map((r) => ({
        ...r,
        total_revenue: parseFloat(r.total_revenue.toFixed(2)),
        total_hours: parseFloat(r.total_hours.toFixed(2)),
      }));
    }

    // Nếu type = NETWORK, bổ sung danh sách kênh gộp
    let allChannels = [];
    if (type === "NETWORK" && !group_by_channel) {
      allChannels = await Channel.findAll({
        attributes: ["id", "name"],
        raw: true,
      });
      aggregatedRows = aggregatedRows.map((r) => ({
        ...r,
        channel_name: "All channels",
        channel_ids: allChannels.map((c) => c.id),
        channel_list: allChannels,
      }));
    }

    // Phân trang thủ công (vì đã load tất cả)
    const startIdx = (page - 1) * page_size;
    const pagedRows = aggregatedRows.slice(startIdx, startIdx + page_size);

    const summary = aggregatedRows.reduce(
      (acc, r) => {
        acc.total_revenue += parseFloat(r.total_revenue || 0);
        acc.total_hours += parseFloat(r.total_hours || 0);
        acc.total_sessions += parseInt(r.total_sessions || 0, 10);
        return acc;
      },
      { total_revenue: 0, total_hours: 0, total_sessions: 0 }
    );

    return {
      data: pagedRows,
      pagination: {
        page,
        page_size,
        total: aggregatedRows.length,
      },
      summary: {
        total_revenue: parseFloat(summary.total_revenue.toFixed(2)),
        total_hours: parseFloat(summary.total_hours.toFixed(2)),
        total_sessions: summary.total_sessions,
      },
      channels: type === "NETWORK" ? allChannels : undefined,
    };
  }

  /**
   * Chart data (no pagination) - tr��� m���ng theo date_value
   */
  static async chart(params) {
    const { data } = await this.list({ ...params, page: 1, page_size: 5000 });
    return data.map((r) => ({
      date: r.date_value,
      total_revenue: parseFloat(r.total_revenue),
      total_hours: parseFloat(r.total_hours),
      total_sessions: r.total_sessions || 0,
      type: r.type,
      section: r.section,
      value_id: r.value_id,
      channel_name: r.channel_name || null,
    }));
  }

  /**
   * Export Excel theo b��T l��?c
   */
  static async exportExcel(params) {
    const { data, summary } = await this.list({
      ...params,
      page: 1,
      page_size: 5000, // giới hạn để tránh file quá lớn
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Revenue Report");
    const detail = params.detail || "aggregate";

    if (detail === "session") {
      sheet.columns = [
        { header: "Date", key: "date_value", width: 15 },
        { header: "Channel ID", key: "channel_id", width: 12 },
        { header: "Channel Name", key: "channel_name", width: 20 },
        { header: "Start", key: "start_at", width: 20 },
        { header: "End", key: "end_at", width: 20 },
        { header: "Hours", key: "total_hours", width: 10 },
        { header: "Revenue", key: "total_revenue", width: 15 },
      ];

      data.forEach((row) => {
        sheet.addRow({
          date_value: dayjs(row.date_value).format("YYYY-MM-DD"),
          channel_id: row.channel_id || row.value_id || "",
          channel_name: row.channel_name || "",
          start_at: row.start_at ? dayjs(row.start_at).format() : "",
          end_at: row.end_at ? dayjs(row.end_at).format() : "",
          total_hours: row.total_hours,
          total_revenue: row.total_revenue,
        });
      });
    } else {
      sheet.columns = [
        { header: "Date", key: "date_value", width: 15 },
        { header: "Type", key: "type", width: 12 },
        { header: "Section", key: "section", width: 12 },
        { header: "Channel ID", key: "value_id", width: 12 },
        { header: "Channel Name", key: "channel_name", width: 20 },
        { header: "Total Sessions", key: "total_sessions", width: 15 },
        { header: "Total Revenue", key: "total_revenue", width: 18 },
        { header: "Total Hours", key: "total_hours", width: 15 },
      ];

      data.forEach((row) => {
        sheet.addRow({
          date_value: row.date_value,
          type: row.type,
          section: row.section,
          value_id: row.value_id || "",
          channel_name: row.channel_name || "",
          total_sessions: row.total_sessions || 0,
          total_revenue: parseFloat(row.total_revenue),
          total_hours: parseFloat(row.total_hours),
        });
      });
    }

    // summary row
    sheet.addRow({});
    sheet.addRow({
      date_value: "SUMMARY",
      total_sessions: summary.total_sessions,
      total_revenue: parseFloat(summary.total_revenue || 0),
      total_hours: parseFloat(summary.total_hours || 0),
    });

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Update 1 record (total_revenue / total_hours)
   */
  static async update(id, body) {
    const record = await RevenueReport.findByPk(id);
    if (!record) {
      throw { status: 404, message: "Revenue report not found" };
    }

    const patch = {};
    if (body.total_revenue !== undefined) patch.total_revenue = body.total_revenue;
    if (body.total_hours !== undefined) patch.total_hours = body.total_hours;

    await record.update(patch);
    return record;
  }

  /**
   * Aggregate DAILY -> MONTHLY/YEARLY (upsert into revenue_reports)
   */
  static async aggregate({ section, from, to }) {
    if (!["MONTHLY", "YEARLY"].includes(section)) {
      throw { status: 400, message: "section must be MONTHLY or YEARLY" };
    }

    const fromDate = from ? dayjs(from).startOf("day").format("YYYY-MM-DD") : null;
    const toDate = to ? dayjs(to).endOf("day").format("YYYY-MM-DD") : null;

    // Lấy dữ liệu DAILY hiện có trong revenue_reports (NETWORK + CHANNEL)
    const whereDaily = { section: "DAILY" };
    if (fromDate || toDate) {
      whereDaily.date_value = {};
      if (fromDate) whereDaily.date_value[Op.gte] = fromDate;
      if (toDate) whereDaily.date_value[Op.lte] = toDate;
    }

    const daily = await RevenueReport.findAll({
      where: whereDaily,
      raw: true,
    });

    const dailyMap = new Map();
    daily.forEach((r) => {
      const normalizedId = normalizeValueId(r.type, r.value_id);
      const dateKey = dayjs(r.date_value).format("YYYY-MM-DD");
      const key = `${r.type}-${normalizedId ?? "NULL"}-${dateKey}`;
      const payload = { ...r, value_id: toDbValueId(r.type, r.value_id) };
      const existing = dailyMap.get(key);
      if (!existing) {
        dailyMap.set(key, payload);
        return;
      }
      const existingTime = existing.created_at ? dayjs(existing.created_at).valueOf() : 0;
      const payloadTime = payload.created_at ? dayjs(payload.created_at).valueOf() : 0;
      if (payloadTime >= existingTime) {
        dailyMap.set(key, payload);
      }
    });
    const dedupedDaily = Array.from(dailyMap.values());

    // Gom nhóm
    const buckets = {};
    dedupedDaily.forEach((r) => {
      const bucket =
        section === "MONTHLY"
          ? dayjs(r.date_value).format("YYYY-MM")
          : dayjs(r.date_value).format("YYYY");
      const key = `${r.type}-${normalizeValueId(r.type, r.value_id) ?? "ALL"}-${bucket}`;
      if (!buckets[key]) {
        buckets[key] = {
          type: r.type,
          section,
          value_id: r.value_id,
          bucket,
          total_revenue: 0,
          total_hours: 0,
        };
      }
      buckets[key].total_revenue += parseFloat(r.total_revenue || 0);
      buckets[key].total_hours += parseFloat(r.total_hours || 0);
    });

    const items = Object.values(buckets);

    const t = await sequelize.transaction();
    try {
      for (const item of items) {
        // date_value đặt về ngày đầu tháng/năm
        const dateValue =
          section === "MONTHLY"
            ? `${item.bucket}-01`
            : `${item.bucket}-01-01`;

        if (item.type === "NETWORK") {
          const existing = await RevenueReport.findOne({
            where: {
              type: item.type,
              section,
              value_id: { [Op.is]: null },
              date_value: dateValue,
            },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (existing) {
            await existing.update(
              {
                total_revenue: parseFloat(item.total_revenue.toFixed(2)),
                total_hours: parseFloat(item.total_hours.toFixed(2)),
              },
              { transaction: t }
            );
          } else {
            await RevenueReport.create(
              {
                type: item.type,
                section,
                value_id: null,
                date_value: dateValue,
                total_revenue: parseFloat(item.total_revenue.toFixed(2)),
                total_hours: parseFloat(item.total_hours.toFixed(2)),
              },
              { transaction: t }
            );
          }
        } else {
          await RevenueReport.upsert(
            {
              type: item.type,
              section,
              value_id: item.value_id,
              date_value: dateValue,
              total_revenue: parseFloat(item.total_revenue.toFixed(2)),
              total_hours: parseFloat(item.total_hours.toFixed(2)),
            },
            { transaction: t }
          );
        }
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return { aggregated: items.length, section, from: fromDate, to: toDate };
  }
}

module.exports = RevenueReportService;
