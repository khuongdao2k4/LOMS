const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/adminBookingConfig.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const {
  updateBookingConfigSchema,
  validateChannelExistence,
} = require("../validation/booking.schema");

/**
 * @swagger
 * tags:
 *   name: Admin Booking Config
 *   description: Quản lý cấu hình booking cho kênh
 */

/**
 * @swagger
 * /api/v1/channels/{id}/booking-config:
 *   get:
 *     summary: Lấy cấu hình booking của kênh
 *     tags: [Admin Booking Config]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Cấu hình booking
 *       404:
 *         description: Không tìm thấy cấu hình
 */
router.get(
  "/:id/booking-config",
  auth(true),
  requireRole("ADMIN"),
  validateChannelExistence,
  ctrl.getBookingConfig
);

/**
 * @swagger
 * /api/v1/channels/{id}/booking-config:
 *   put:
 *     summary: Cập nhật cấu hình booking
 *     tags: [Admin Booking Config]
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
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     weekday:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 7
 *                       example: 1
 *                     start:
 *                       type: string
 *                       pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$"
 *                       example: "09:00"
 *                     end:
 *                       type: string
 *                       pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$"
 *                       example: "17:00"
 *               min_duration_minutes:
 *                 type: integer
 *                 minimum: 5
 *                 example: 30
 *               max_duration_minutes:
 *                 type: integer
 *                 minimum: 5
 *                 example: 120
 *               timezone:
 *                 type: string
 *                 example: "Asia/Ho_Chi_Minh"
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.put(
  "/:id/booking-config",
  auth(true),
  requireRole("ADMIN"),
  validate(updateBookingConfigSchema),
  validateChannelExistence,
  ctrl.updateBookingConfig
);

module.exports = router;
