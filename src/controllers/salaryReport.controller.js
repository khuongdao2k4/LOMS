const PayrollService = require("../services/salaryReport.service");

class PayrollController {
  // 1️⃣ GET /api/payroll/report
  static async getReport(req, res) {
    try {
      const data = await PayrollService.getReport(req.query);
      res.json({ success: true, data });
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ success: false, message: err.message });
    }
  }

  // 2️⃣ GET /api/payroll/export
  static async exportExcel(req, res) {
    try {
      const buffer = await PayrollService.exportExcel(req.query);

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=payroll_report.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ success: false, message: err.message });
    }
  }

  // 3️⃣ PUT /api/payroll/session/:id
  static async manualSessionUpdate(req, res) {
    try {
      const data = await PayrollService.manualSessionUpdate(
        req.params.id,
        req.body
      );
      res.json({ success: true, data });
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ success: false, message: err.message });
    }
  }

  // 4️⃣ POST /api/payroll/salary-report
  static async generateSalaryReport(req, res) {
    try {
      await PayrollService.generateSalaryReport(req.body);
      res.json({
        success: true,
        message: "Salary reports generated/updated",
      });
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ success: false, message: err.message });
    }
  }
}

module.exports = PayrollController;
