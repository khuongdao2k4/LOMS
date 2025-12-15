const {
    Session,
    SessionStaff,
    Employee,
    Channel,
    SalaryReport,
    sequelize,
    Schedule,
    SalaryConfig,
    Event,
  } = require("../models");
const RevenueReportService = require("./revenueReport.service");
const dayjs = require("dayjs");
const ExcelJS = require("exceljs");
const { Op, Sequelize } = require("sequelize");

// Bật mặc định; đặt ENABLE_REVENUE_REPORT_AUTO=false trong .env nếu muốn tắt
const ENABLE_REVENUE_REPORT_AUTO = process.env.ENABLE_REVENUE_REPORT_AUTO !== "false";

class PayrollService {
    // 1️⃣ GET /api/payroll/report
    static async getReport({ from, to, employee_id, month, year }) {
      const where = {};
  
      // ✅ Filter theo khoảng thời gian (from/to)
      if (from) {
        where.actual_start_at = { [Op.gte]: from };
      }
      if (to) {
        // 🔵 SỬA ĐỔI: Sửa logic filter 'to' - dùng actual_start_at thay vì actual_end_at
        where.actual_start_at = {
          ...where.actual_start_at,
          [Op.lte]: to,
        };
      }
  
      // ✅ Filter theo tháng/năm (month/year)
      if (month && year) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          Sequelize.where(
            Sequelize.fn(
              "EXTRACT",
              Sequelize.literal("MONTH FROM actual_start_at")
            ),
            month
          ),
          Sequelize.where(
            Sequelize.fn(
              "EXTRACT",
              Sequelize.literal("YEAR FROM actual_start_at")
            ),
            year
          ),
        ];
      } else if (month) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          Sequelize.where(
            Sequelize.fn(
              "EXTRACT",
              Sequelize.literal("MONTH FROM actual_start_at")
            ),
            month
          ),
        ];
      } else if (year) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          Sequelize.where(
            Sequelize.fn(
              "EXTRACT",
              Sequelize.literal("YEAR FROM actual_start_at")
            ),
            year
          ),
        ];
      }
  
      // 🟢 MỚI THÊM: Chỉ lấy sessions đã kích hoạt (có actual_start_at)
      where.actual_start_at = {
        ...where.actual_start_at,
        [Op.ne]: null,
      };

      where.status = "ENDED";
  
      const sessions = await Session.findAll({
        where,
        include: [
          {
            model: SessionStaff,
            as: "staff",
            where: employee_id ? { employee_id } : undefined,
            required: false,
            include: [
              {
                model: Employee,
                as: "Employee",
                required: true,
                include: [
                  {
                    model: SalaryConfig,
                    as: "salaryConfig",
                    required: false,
                  },
                ],
              },
            ],
          },
          { model: Channel, as: "channel", required: false },
          { model: Schedule, as: "schedule", required: false },
          { model: Event, as: "event", required: false },
        ],
        order: [["actual_start_at", "ASC"]],
      });
  
      const detailed = [];
      const summary = {};
  
      for (const s of sessions) {
        const staffs = s.staff || [];
        if (!staffs.length) continue;
  
        for (const st of staffs) {
          // 🔵 SỬA ĐỔI: Hỗ trợ sessions đang diễn ra (theo F6.2.2)
          if (!s.actual_start_at) {
            continue; // Skip nếu chưa kích hoạt
          }
  
          // 🟢 MỚI THÊM: Tính actual_hours hỗ trợ sessions đang diễn ra
          const endTime = s.actual_end_at || dayjs().utc().toDate();
          const actualHours = parseFloat(
            (
              dayjs(endTime).diff(dayjs(s.actual_start_at), "minute") / 60
            ).toFixed(2)
          );
          // ✅ Logic lấy scheduled_hours và schedule_time
          let scheduledHours = 0;
          let scheduleTime = "N/A";
          // 🟢 MỚI THÊM: Thêm biến lưu thời gian schedule gốc
          let scheduleStart = null;
          let scheduleEnd = null;
  
          if (s.schedule?.start_at && s.schedule?.end_at) {
            // Case 1: Ưu tiên Schedule (event có schedule_id)
            const startTime = dayjs(s.schedule.start_at, "HH:mm:ss");
            const endTime = dayjs(s.schedule.end_at, "HH:mm:ss");
            scheduledHours = parseFloat(
              (endTime.diff(startTime, "minute") / 60).toFixed(2)
            );
            scheduleTime = `${startTime.format("HH:mm")} - ${endTime.format(
              "HH:mm"
            )}`;
            // 🟢 MỚI THÊM: Lưu giá trị gốc
            scheduleStart = s.schedule.start_at;
            scheduleEnd = s.schedule.end_at;
          } else if (s.event?.start_at && s.event?.end_at) {
            // Case 2: Lấy từ Event (ca tùy chỉnh - schedule_id = null)
            scheduledHours = parseFloat(
              (
                dayjs(s.event.end_at).diff(dayjs(s.event.start_at), "minute") / 60
              ).toFixed(2)
            );
            scheduleTime = `${dayjs(s.event.start_at).format("HH:mm")} - ${dayjs(
              s.event.end_at
            ).format("HH:mm")}`;
            // 🟢 MỚI THÊM: Lưu giá trị gốc
            scheduleStart = s.event.start_at;
            scheduleEnd = s.event.end_at;
          } else if (s.total_hours) {
            // Case 3: Fallback sang total_hours của session
            scheduledHours = parseFloat(s.total_hours);
            scheduleTime =
              s.actual_start_at && endTime
                ? `${dayjs(s.actual_start_at).format("HH:mm")} - ${dayjs(
                    endTime
                  ).format("HH:mm")}`
                : "N/A";
          }
  
          // 🔵 SỬA ĐỔI: Revenue LUÔN hiển thị (theo F4.2 - crawl luôn chạy)
          const revenueStart = parseFloat(s.revenue_start) || 0;
          const revenueEnd = parseFloat(s.revenue_end) || 0;
          // 🟢 MỚI: LUÔN tính revenue bất kể revenue_enabled_snap
          const revenue = parseFloat((revenueEnd - revenueStart).toFixed(2));
  
          const role = st.role || "N/A";
  
          // ✅ Lấy salary config
          const salaryConfig = st.Employee?.salaryConfig;
          const baseSalary = salaryConfig
            ? parseFloat(salaryConfig.base_salary) || 0
            : 0;
  
          const hourlyRate = salaryConfig
            ? parseFloat(
                role === "LIVE"
                  ? salaryConfig.hourly_rate_live
                  : salaryConfig.hourly_rate_support
              ) || 0
            : 0;
  
          const totalSalary = parseFloat((actualHours * hourlyRate).toFixed(2));
  
          // ✅ Build detailed row - THEO ĐÚNG F6.2.2
          const row = {
            session_id: s.id,
            date: dayjs(s.actual_start_at).format("YYYY-MM-DD"), // Ngày diễn ra
            channel: s.channel?.name || "N/A", // Kênh
            schedule_time: scheduleTime, // Ca làm được giao (Lịch)
            // 🟢 MỚI THÊM: Thêm schedule gốc để phục vụ manual override
            schedule_start: scheduleStart,
            schedule_end: scheduleEnd,
            scheduled_hours: scheduledHours, // Giờ làm được giao (Lịch)
            actual_hours: actualHours, // Giờ làm thực tế
            role, // Vị trí
            employee: {
              id: st.employee_id,
              name: st.Employee?.full_name || "N/A",
            },
            revenue, // 🔵 SỬA: LUÔN hiển thị doanh thu
            // 🟢 MỚI THÊM: Thêm cờ để biết có tính vào lương/thưởng không
            revenue_enabled: s.revenue_enabled_snap ? true : false,
            hourly_rate: hourlyRate, // Lương theo giờ (Đơn giá)
            base_salary: baseSalary, // Lương cơ bản (tham khảo)
            total_salary: totalSalary, // Tổng lương ca
            // 🟢 MỚI THÊM: Đánh dấu ca đang diễn ra
            is_ongoing: !s.actual_end_at,
            // 🟢 MỚI THÊM: Thông tin thời gian thực tế (để manual override)
            actual_start_at: s.actual_start_at,
            actual_end_at: s.actual_end_at,
          };
  
          detailed.push(row);
  
          // ✅ Build summary - FIX: base_salary chỉ tính 1 lần
          if (!summary[st.employee_id]) {
            summary[st.employee_id] = {
              employee_id: st.employee_id,
              employee_name: st.Employee?.full_name || "N/A",
              portrait_url: st.Employee?.portrait_url || null,
              total_sessions: 0,
              total_actual_hours: 0, // Tổng Giờ làm thực tế
              total_revenue: 0, // Tổng Doanh thu
              total_hourly_salary: 0, // Tổng Lương theo giờ
              base_salary: 0, // Lương cơ bản (áp dụng 1 lần)
              total_final_salary: 0, // TỔNG LƯƠNG CUỐI CÙNG
            };
          }

          // ✅ Cộng dồn
          summary[st.employee_id].total_sessions += 1;
          summary[st.employee_id].total_actual_hours = parseFloat(
            (summary[st.employee_id].total_actual_hours + actualHours).toFixed(2)
          );
          summary[st.employee_id].total_revenue = parseFloat(
            (summary[st.employee_id].total_revenue + revenue).toFixed(2)
          );
          summary[st.employee_id].total_hourly_salary = parseFloat(
            (summary[st.employee_id].total_hourly_salary + totalSalary).toFixed(2)
          );
  
          // ✅ Chỉ set base_salary 1 lần (không cộng dồn)
          if (baseSalary > 0 && summary[st.employee_id].base_salary === 0) {
            summary[st.employee_id].base_salary = baseSalary;
          }
  
          // ✅ Tính tổng lương cuối - THEO ĐÚNG F6.2.3
          summary[st.employee_id].total_final_salary = parseFloat(
            (
              summary[st.employee_id].base_salary +
              summary[st.employee_id].total_hourly_salary
            ).toFixed(2)
          );
        }
      }
  
      return {
        detailed,
        summary: Object.values(summary),
      };
    }
  
    // 2️⃣ GET /api/payroll/export
    static async exportExcel(query) {
      const { detailed, summary } = await this.getReport(query);
  
      const workbook = new ExcelJS.Workbook();
  
      // Sheet 1: Detailed - THEO F6.2.2
      const sheet1 = workbook.addWorksheet("Chi tiết ca làm việc");
      sheet1.columns = [
        { header: "Session ID", key: "session_id", width: 15 },
        { header: "Ngày diễn ra", key: "date", width: 15 }, // 🔵 SỬA: Đổi tên rõ ràng hơn
        { header: "Kênh", key: "channel", width: 20 },
        { header: "Ca làm được giao (Lịch)", key: "schedule_time", width: 25 }, // 🔵 SỬA: Tên đúng F6.2
        { header: "Giờ làm được giao (Lịch)", key: "scheduled_hours", width: 18 }, // 🔵 SỬA: Tên đúng F6.2
        { header: "Giờ làm thực tế", key: "actual_hours", width: 15 },
        { header: "Vị trí", key: "role", width: 15 },
        { header: "Nhân viên", key: "employee", width: 30 },
        { header: "Doanh thu", key: "revenue", width: 15 },
        // 🟢 MỚI THÊM: Cột đánh dấu có tính vào lương không
        { header: "Tính lương DT", key: "revenue_enabled", width: 15 },
        { header: "Lương theo giờ (Đơn giá)", key: "hourly_rate", width: 20 }, // 🔵 SỬA: Tên đúng F6.2
        { header: "Lương cơ bản (Ref)", key: "base_salary", width: 18 }, // 🔵 SỬA: Thêm (Ref)
        { header: "Tổng lương ca", key: "total_salary", width: 15 },
        // 🟢 MỚI THÊM: Cột đánh dấu ca đang diễn ra
        { header: "Đang diễn ra", key: "is_ongoing", width: 15 },
      ];
  
      detailed.forEach((d) => {
        sheet1.addRow({
          ...d,
          employee: `${d.employee.id} - ${d.employee.name}`,
          // 🟢 MỚI THÊM: Format boolean sang text
          revenue_enabled: d.revenue_enabled ? "Có" : "Không",
          is_ongoing: d.is_ongoing ? "Đang live" : "Đã kết thúc",
        });
      });
  
      // Sheet 2: Summary - THEO F6.2.3
      const sheet2 = workbook.addWorksheet("Tổng hợp");
      sheet2.columns = [
        { header: "Mã NV", key: "employee_id", width: 15 },
        { header: "Tên nhân viên", key: "employee_name", width: 25 },
        { header: "Tổng Giờ làm thực tế", key: "total_actual_hours", width: 20 }, // 🔵 SỬA: Tên đúng F6.2.3
        { header: "Tổng Doanh thu", key: "total_revenue", width: 18 }, // 🔵 SỬA: Tên đúng F6.2.3
        { header: "Tổng Lương theo giờ", key: "total_hourly_salary", width: 20 }, // 🔵 SỬA: Tên đúng F6.2.3
        { header: "Lương cơ bản", key: "base_salary", width: 18 },
        { header: "TỔNG LƯƠNG CUỐI CÙNG", key: "total_final_salary", width: 22 }, // 🔵 SỬA: Tên đúng F6.2.3
      ];
  
      summary.forEach((s) => {
        sheet2.addRow(s);
      });
  
      return workbook.xlsx.writeBuffer();
    }
  
    // 3️⃣ PUT /api/payroll/session/:id (Manual override) - THEO F6.2.4
    static async manualSessionUpdate(id, body) {
      // 🟢 MỚI THÊM: Dùng transaction để đảm bảo data integrity
      const transaction = await sequelize.transaction();
  
      try {
        const session = await Session.findByPk(id, { transaction });
  
        if (!session) {
          throw { status: 404, message: "Session not found" };
        }
  
        // ✅ Chỉ cho phép sửa các trường specific
        const allowedFields = [
          "actual_start_at",
          "actual_end_at",
          "revenue_start",
          "revenue_end",
          "screenshot_url",
          "screenshot_start_url",
          "screenshot_end_url",
          "late_flag",
          "status",
          // Cho phép sửa cờ revenue_enabled
          "revenue_enabled_snap",
        ];
  
        const updateData = {};
        Object.keys(body).forEach((key) => {
          if (allowedFields.includes(key)) {
            updateData[key] = body[key];
          }
        });
  
        // 🟢 MỚI THÊM: Validate thời gian nếu có sửa
        if (updateData.actual_start_at && updateData.actual_end_at) {
          const start = dayjs(updateData.actual_start_at);
          const end = dayjs(updateData.actual_end_at);
  
          if (end.isBefore(start)) {
            throw {
              status: 400,
              message: "actual_end_at phải sau actual_start_at",
            };
          }
        }
  
        await session.update(updateData, { transaction });
  
        // 🟢 MỚI THÊM: Reload để lấy GENERATED columns
        await session.reload({ transaction });

        // Chuẩn hóa dateValue dùng cho DAILY và aggregate MONTHLY/YEARLY
        const sessionStart = session.actual_start_at || session.start_at;
        const dateValue = sessionStart ? dayjs(sessionStart).utc().format("YYYY-MM-DD") : null;

        // --- Auto-update revenue_reports (daily) ---
        if (ENABLE_REVENUE_REPORT_AUTO) {
          if (dateValue && session.channel_id) {
            const revenueStart =
              updateData.revenue_start !== undefined
                ? parseFloat(updateData.revenue_start)
                : parseFloat(session.revenue_start) || 0;
            const revenueEnd =
              updateData.revenue_end !== undefined
                ? parseFloat(updateData.revenue_end)
                : parseFloat(session.revenue_end) || 0;
            const revenueTotal = parseFloat(
              ((revenueEnd || 0) - (revenueStart || 0)).toFixed(2)
            );

            const totalHours =
              session.total_hours !== undefined && session.total_hours !== null
                ? parseFloat(session.total_hours)
                : session.actual_start_at && session.actual_end_at
                ? parseFloat(
                    (
                      dayjs(session.actual_end_at).diff(
                        dayjs(session.actual_start_at),
                        "minute"
                      ) / 60
                    ).toFixed(2)
                  )
                : 0;

            // type=CHANNEL, section=DAILY
            await RevenueReportService.upsertRevenueReport({
              type: "CHANNEL",
              section: "DAILY",
              valueId: session.channel_id,
              dateValue,
              totalRevenue: revenueTotal,
              totalHours,
              transaction,
            });

            // type=NETWORK, section=DAILY (tong he thong)
            await RevenueReportService.upsertRevenueReport({
              type: "NETWORK",
              section: "DAILY",
              valueId: null,
              dateValue,
              totalRevenue: revenueTotal,
              totalHours,
              transaction,
            });
          }
        }

        await transaction.commit();

        // Sau khi commit, cập nhật gộp MONTHLY từ DAILY để có sẵn báo cáo tháng
        if (ENABLE_REVENUE_REPORT_AUTO && session.channel_id && dateValue) {
          const monthStart = dayjs(dateValue).startOf("month").format("YYYY-MM-DD");
          const monthEnd = dayjs(dateValue).endOf("month").format("YYYY-MM-DD");
          try {
            await RevenueReportService.aggregate({
              section: "MONTHLY",
              from: monthStart,
              to: monthEnd,
            });
          } catch (err) {
            // Nuốt lỗi để không ảnh hưởng response; log nếu cần
            console.error("Aggregate MONTHLY failed", err.message);
          }

          // Đồng bộ luôn YEARLY để tránh lệch dữ liệu
          const yearStart = dayjs(dateValue).startOf("year").format("YYYY-MM-DD");
          const yearEnd = dayjs(dateValue).endOf("year").format("YYYY-MM-DD");
          try {
            await RevenueReportService.aggregate({
              section: "YEARLY",
              from: yearStart,
              to: yearEnd,
            });
          } catch (err) {
            console.error("Aggregate YEARLY failed", err.message);
          }
        }
  
        // ✅ Trả về đầy đủ thông tin
        const updatedSession = await Session.findByPk(id, {
          include: [
            {
              model: SessionStaff,
              as: "staff",
              include: [
                {
                  model: Employee,
                  as: "Employee",
                  include: [
                    {
                      model: SalaryConfig,
                      as: "salaryConfig",
                      required: false,
                    },
                  ],
                },
              ],
            },
            { model: Channel, as: "channel" },
            { model: Schedule, as: "schedule" },
            { model: Event, as: "event" },
          ],
        });
  
        return {
          success: true,
          message: "Session updated successfully",
          updated_session: updatedSession,
          // 🟢 MỚI THÊM: Trả về các giá trị GENERATED
          calculated_values: {
            total_seconds: updatedSession.total_seconds,
            total_hours: updatedSession.total_hours,
          },
        };
      } catch (error) {
        try {
          if (!transaction.finished) {
            await transaction.rollback();
          }
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr.message);
        }
        throw error;
      }
    }
  
    // 4️⃣ POST /api/payroll/salary-report (Tạo báo cáo tháng)
    static async generateSalaryReport({ month, year }) {
      // 🟢 MỚI THÊM: Dùng transaction
      const transaction = await sequelize.transaction();
  
      try {
        // ✅ Xóa báo cáo cũ của tháng này (nếu có)
        await SalaryReport.destroy({
          where: { month, year },
          transaction,
        });
  
        // ✅ Lấy tất cả sessions trong tháng
        const sessions = await Session.findAll({
          where: {
            [Op.and]: [
              Sequelize.where(
                Sequelize.fn(
                  "EXTRACT",
                  Sequelize.literal("MONTH FROM actual_start_at")
                ),
                month
              ),
              Sequelize.where(
                Sequelize.fn(
                  "EXTRACT",
                  Sequelize.literal("YEAR FROM actual_start_at")
                ),
                year
              ),
              // 🟢 MỚI THÊM: Chỉ lấy sessions đã hoàn thành
              { actual_end_at: { [Op.ne]: null } },
            ],
          },
          include: [
            {
              model: SessionStaff,
              as: "staff",
              include: [
                {
                  model: Employee,
                  as: "Employee",
                  include: [
                    {
                      model: SalaryConfig,
                      as: "salaryConfig",
                      required: false,
                    },
                  ],
                },
              ],
            },
          ],
          transaction,
        });
  
        // ✅ TỔNG HỢP DỮ LIỆU THEO EMPLOYEE (giống logic getReport())
        const employeeSummary = {};
  
        for (const s of sessions) {
          const staffs = s.staff || [];
  
          for (const st of staffs) {
            // 🔵 SỬA: Kiểm tra rõ ràng hơn
            if (!s.actual_start_at || !s.actual_end_at) continue;
            // ✅ Tính actual hours (CÓ LÀM TRÒN)
            const actualHours = parseFloat(
              (
                dayjs(s.actual_end_at).diff(dayjs(s.actual_start_at), "minute") /
                60
              ).toFixed(2)
            );
  
            // ✅ Lấy hourly rate
            const hourlyRate = parseFloat(
              st.Employee?.salaryConfig?.[
                st.role === "LIVE" ? "hourly_rate_live" : "hourly_rate_support"
              ] ?? 0
            );
  
            // 🔵 SỈA: Revenue LUÔN thu thập (theo F4.2)
            const revenueStart = parseFloat(s.revenue_start) || 0;
            const revenueEnd = parseFloat(s.revenue_end) || 0;
            const revenue = parseFloat((revenueEnd - revenueStart).toFixed(2));
  
            const totalSalary = parseFloat((actualHours * hourlyRate).toFixed(2));
  
            // ✅ Khởi tạo summary cho employee nếu chưa có
            if (!employeeSummary[st.employee_id]) {
              const baseSalary =
                parseFloat(st.Employee?.salaryConfig?.base_salary) || 0;
  
              employeeSummary[st.employee_id] = {
                employee_id: st.employee_id,
                month,
                year,
                total_hours_live: 0,
                total_hours_support: 0,
                total_revenue: 0,
                total_hourly_salary: 0,
                base_salary: baseSalary, // ✅ Lưu base_salary
              };
            }
  
            // ✅ Cộng dồn theo role
            if (st.role === "LIVE") {
              employeeSummary[st.employee_id].total_hours_live = parseFloat(
                (
                  employeeSummary[st.employee_id].total_hours_live + actualHours
                ).toFixed(2)
              );
            } else if (st.role === "SUPPORT") {
              employeeSummary[st.employee_id].total_hours_support = parseFloat(
                (
                  employeeSummary[st.employee_id].total_hours_support +
                  actualHours
                ).toFixed(2)
              );
            }
  
            employeeSummary[st.employee_id].total_revenue = parseFloat(
              (employeeSummary[st.employee_id].total_revenue + revenue).toFixed(2)
            );
  
            employeeSummary[st.employee_id].total_hourly_salary = parseFloat(
              (
                employeeSummary[st.employee_id].total_hourly_salary + totalSalary
              ).toFixed(2)
            );
          }
        }
  
        // ✅ LƯU VÀO DATABASE - 1 RECORD CHO MỖI EMPLOYEE
        const reports = Object.values(employeeSummary).map((summary) => ({
          employee_id: summary.employee_id,
          month: summary.month,
          year: summary.year,
          total_hours_live: summary.total_hours_live,
          total_hours_support: summary.total_hours_support,
          total_revenue: summary.total_revenue,
          total_salary: parseFloat(
            (summary.base_salary + summary.total_hourly_salary).toFixed(2)
          ), // ✅ Tổng lương = base + hourly
        }));
  
        // ✅ Bulk create tất cả records
        if (reports.length > 0) {
          await SalaryReport.bulkCreate(reports, { transaction });
        }
  
        await transaction.commit();
  
        return {
          success: true,
          message: `Salary report generated for ${reports.length} employees`,
          reports_created: reports.length,
          month,
          year,
        };
      } catch (error) {
        await transaction.rollback();
        console.error("❌ Error generating salary report:", error);
        throw error;
      }
    }
  }
  
  module.exports = PayrollService;
  
