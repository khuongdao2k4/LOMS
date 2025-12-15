"use strict";

const RevenueReportService = require("../services/revenueReport.service");

class RevenueReportController {
  // GET /api/v1/revenue-report
  static async list(req, res) {
    try {
      const result = await RevenueReportService.list(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("list revenue report error", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // GET /api/v1/revenue-report/chart
  static async chart(req, res) {
    try {
      const result = await RevenueReportService.chart(req.query);
      res.json({ success: true, data: result });
    } catch (err) {
      console.error("chart revenue report error", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // GET /api/v1/revenue-report/export
  static async exportExcel(req, res) {
    try {
      const buffer = await RevenueReportService.exportExcel(req.query);
      res.setHeader("Content-Disposition", "attachment; filename=revenue_report.xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
    } catch (err) {
      console.error("export revenue report error", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // PUT /api/v1/revenue-report/:id
  static async update(req, res) {
    try {
      const data = await RevenueReportService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      console.error("update revenue report error", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }

  // POST /api/v1/revenue-report/aggregate (build MONTHLY/YEARLY from DAILY)
  static async aggregate(req, res) {
    try {
      const result = await RevenueReportService.aggregate(req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      console.error("aggregate revenue report error", err);
      res.status(err.status || 500).json({ success: false, message: err.message });
    }
  }
}

module.exports = RevenueReportController;
