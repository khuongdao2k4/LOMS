require("dotenv").config();
const dayjs = require("dayjs");
const app = require("./app");
const scheduleAutoService = require("./services/scheduleAuto.service");
const revenueReportService = require("./services/revenueReport.service");

const port = process.env.PORT || 3000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runScheduleJob() {
  try {
    const days = 7; // sinh event cho 7 ngày tới
    const result = await scheduleAutoService.generateEventsFromSchedules({ days });
    console.log(
      `[ScheduleJob] Generated ${result.created} events from schedules for next ${days} day(s)`
    );
  } catch (err) {
    console.error("[ScheduleJob] Error:", err);
  }
}

async function runRevenueAggregateJob() {
  try {
    // Gom 3 tháng gần nhất -> MONTHLY & YEARLY
    const from = dayjs().subtract(3, "month").startOf("month").format("YYYY-MM-DD");
    const to = dayjs().endOf("day").format("YYYY-MM-DD");

    await revenueReportService.aggregate({ section: "MONTHLY", from, to });
    await revenueReportService.aggregate({ section: "YEARLY", from, to });

    console.log(
      `[RevenueAggregateJob] Aggregated MONTHLY & YEARLY from ${from} to ${to}`
    );
  } catch (err) {
    console.error("[RevenueAggregateJob] Error:", err);
  }
}

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);

  // chạy 1 lần khi server khởi động
  runScheduleJob();
  runRevenueAggregateJob();

  // mỗi 24h chạy lại
  setInterval(runScheduleJob, ONE_DAY_MS);
  setInterval(runRevenueAggregateJob, ONE_DAY_MS);
});
