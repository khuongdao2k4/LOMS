"use strict";

const express = require("express");
const router = express.Router();

const RevenueReportController = require("../controllers/revenueReport.controller");
const validate = require("../middleware/validate");
const { revenueQuerySchema, revenueUpdateSchema, revenueAggregateSchema } = require("../validation/revenue_report.schema");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// GET list + summary (có phân trang)
router.get(
  "/",
  auth(true),
  requireRole("ADMIN"),
  validate(revenueQuerySchema, "query"),
  RevenueReportController.list
);

// GET chart data
router.get(
  "/chart",
  auth(true),
  requireRole("ADMIN"),
  validate(revenueQuerySchema, "query"),
  RevenueReportController.chart
);

// Export Excel
router.get(
  "/export",
  auth(true),
  requireRole("ADMIN"),
  validate(revenueQuerySchema, "query"),
  RevenueReportController.exportExcel
);

// Update 1 record
router.put(
  "/:id",
  auth(true),
  requireRole("ADMIN"),
  validate(revenueUpdateSchema),
  RevenueReportController.update
);

// Aggregate MONTHLY/YEARLY từ DAILY
router.post(
  "/aggregate",
  auth(true),
  requireRole("ADMIN"),
  validate(revenueAggregateSchema),
  RevenueReportController.aggregate
);

module.exports = router;
