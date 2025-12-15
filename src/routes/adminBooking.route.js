const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/adminBooking.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");
const {
  getAdminBookingsSchema,
  approveBookingSchema,
  rejectBookingSchema,
  cancelBookingSchema,
} = require("../validation/booking.schema");

/**
 * @swagger
 * tags:
 *   name: Admin Booking
 *   description: Quản lý booking (duyệt/từ chối/hủy)
 */

/**
 * @swagger
 * /api/v1/bookings:
 *   get:
 *     summary: Lấy danh sách booking (admin)
 *     tags: [Admin Booking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED, all]
 *       - in: query
 *         name: channel_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách booking
 */
router.get(
  "/",
  auth(true),
  requireRole("ADMIN"),
  validate(getAdminBookingsSchema),
  ctrl.getAdminBookings
);

/**
 * @swagger
 * /api/v1/bookings/{id}:
 *   get:
 *     summary: Xem chi tiết booking
 *     tags: [Admin Booking]
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
 *         description: Chi tiết booking
 *       404:
 *         description: Không tìm thấy booking
 */
router.get(
  "/:id",
  auth(true),
  requireRole("ADMIN"),
  ctrl.getAdminBookingById
);

/**
 * @swagger
 * /api/v1/bookings/{id}/approve:
 *   post:
 *     summary: Duyệt booking
 *     tags: [Admin Booking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Đã xác nhận với khách hàng"
 *     responses:
 *       200:
 *         description: Duyệt thành công
 *       409:
 *         description: Khung giờ đã có booking khác
 */
router.post(
  "/:id/approve",
  auth(true),
  requireRole("ADMIN"),
  validate(approveBookingSchema),
  ctrl.approveBooking
);

/**
 * @swagger
 * /api/v1/bookings/{id}/reject:
 *   post:
 *     summary: Từ chối booking
 *     tags: [Admin Booking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Khung giờ không phù hợp"
 *     responses:
 *       200:
 *         description: Từ chối thành công
 */
router.post(
  "/:id/reject",
  auth(true),
  requireRole("ADMIN"),
  validate(rejectBookingSchema),
  ctrl.rejectBooking
);

/**
 * @swagger
 * /api/v1/bookings/{id}/cancel:
 *   post:
 *     summary: Hủy booking
 *     tags: [Admin Booking]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 example: "Khách hàng yêu cầu hủy"
 *     responses:
 *       200:
 *         description: Hủy thành công
 */
router.post(
  "/:id/cancel",
  auth(true),
  requireRole("ADMIN"),
  validate(cancelBookingSchema),
  ctrl.cancelBooking
);

module.exports = router;
