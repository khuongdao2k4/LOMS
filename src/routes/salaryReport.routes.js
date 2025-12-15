const express = require("express");
const router = express.Router();
const PayrollController = require("../controllers/salaryReport.controller");

const validate = require("../middleware/validate");
const {
  reportQuerySchema,
  manualUpdateBodySchema,
} = require("../validation/salary_report.schema");

const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Map legacy FE params (start_date/end_date -> from/to) to keep compatibility
const normalizeDateQuery = (req, _res, next) => {
  if (req.query.start_date && !req.query.from) {
    req.query.from = req.query.start_date;
  }
  if (req.query.end_date && !req.query.to) {
    req.query.to = req.query.end_date;
  }
  next();
};

// GET /api/payroll/report
router.get(
  "/report",
  auth(true),
  requireRole("ADMIN"),
  normalizeDateQuery,
  validate(reportQuerySchema, "query"),
  PayrollController.getReport
);

// GET /api/payroll/export
router.get(
  "/export",
  auth(true),
  requireRole("ADMIN"),
  normalizeDateQuery,
  validate(reportQuerySchema, "query"),
  PayrollController.exportExcel
);

// Compatibility: allow FE call /report/export
router.get(
  "/report/export",
  auth(true),
  requireRole("ADMIN"),
  normalizeDateQuery,
  validate(reportQuerySchema, "query"),
  PayrollController.exportExcel
);

// PUT /api/payroll/session/:id
router.put(
  "/session/:id",
  auth(true),
  requireRole("ADMIN"),
  validate(manualUpdateBodySchema),
  PayrollController.manualSessionUpdate
);

module.exports = router;
