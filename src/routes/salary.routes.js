// src/routes/salary.routes.js
const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/salary.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const { listQuery, patchBody } = require("../validation/salary.schema");

/**
 * @openapi
 * /api/v1/salary-configs:
 *   get:
 *     tags: [Salary Configs]
 *     summary: Danh sách cấu hình lương (ADMIN)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *
 * /api/v1/salary-configs/{id}:
 *   get:
 *     tags: [Salary Configs]
 *     summary: Xem chi tiết cấu hình lương theo id (ADMIN)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 *   patch:
 *     tags: [Salary Configs]
 *     summary: Cập nhật một phần cấu hình lương (ADMIN)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_salary:
 *                 type: number
 *                 example: 15000000
 *               hourly_rate_live:
 *                 type: number
 *                 example: 30000
 *               hourly_rate_support:
 *                 type: number
 *                 example: 15000
 *     responses:
 *       200:
 *         description: OK
 *       400:
 *         description: Bad Request
 *       404:
 *         description: Not Found
 *
 * /api/v1/salary-configs/by-employee/{employee_id}:
 *   get:
 *     tags: [Salary Configs]
 *     summary: Lấy cấu hình lương theo employee_id (ADMIN)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */

// List
router.get(
  "/salary-configs",
  auth(true),
  requireRole("ADMIN"),
  validate(listQuery),
  ctrl.list
);

// Detail by config id
router.get(
  "/salary-configs/:id",
  auth(true),
  requireRole("ADMIN"),
  ctrl.get
);

// Detail by employee_id (EmployeeDetailModal dùng cái này)
router.get(
  "/salary-configs/by-employee/:employee_id",
  auth(true),
  requireRole("ADMIN"),
  ctrl.getByEmployee
);

// Partial update
router.patch(
  "/salary-configs/:id",
  auth(true),
  requireRole("ADMIN"),
  validate(patchBody),
  ctrl.patch
);

// Delete
router.delete(
  "/salary-configs/:id",
  auth(true),
  requireRole("ADMIN"),
  ctrl.remove
);

module.exports = router;
