const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/schedule.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const validate = require("../middleware/validate");

/**
 * @swagger
 * tags:
 *   name: Schedules
 *   description: Quản lý lịch lặp hàng tuần
 */

/**
 * @swagger
 * /api/v1/schedule:
 *   get:
 *     summary: Lấy danh sách lịch tuần (schedule)
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: channel_id
 *         schema:
 *           type: integer
 *         required: false
 *         description: Lọc theo kênh TikTok
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Lọc theo trạng thái hoạt động
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
 *         description: Danh sách schedule
 */
router.get("/schedule", auth(true), requireRole("ADMIN"), ctrl.list);

/**
 * @swagger
 * /api/v1/schedule:
 *   post:
 *     summary: Tạo lịch lặp hàng tuần (schedule)
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel_id
 *               - weekdays_mask
 *               - start_at
 *               - end_at
 *             properties:
 *               channel_id:
 *                 type: integer
 *                 example: 1
 *               weekdays_mask:
 *                 type: integer
 *                 example: 42
 *                 description: Bitmask thứ 2–CN (1..127)
 *               start_at:
 *                 type: string
 *                 example: "09:00:00"
 *               end_at:
 *                 type: string
 *                 example: "11:00:00"
 *               is_active:
 *                 type: boolean
 *               staff:
 *                 type: array
 *                 description: Replace default staff for this schedule (optional)
 *                 items:
 *                   type: object
 *                   properties:
 *                     employee_id:
 *                       type: integer
 *                     role:
 *                       type: string
 *                       enum: [LIVE, SUPPORT]
 *                     priority:
 *                       type: integer
 *                     is_primary:
 *                       type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Tạo schedule thành công
 */
router.post("/schedule", auth(true), requireRole("ADMIN"), ctrl.create);

/**
 * @swagger
 * /api/v1/schedule/{id}:
 *   get:
 *     summary: Xem chi tiết 1 schedule
 *     tags: [Schedules]
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
 *         description: Thông tin schedule
 *       404:
 *         description: Không tìm thấy
 */
router.get("/schedule/:id", auth(true), requireRole("ADMIN"), ctrl.get);

/**
 * @swagger
 * /api/v1/schedule/{id}:
 *   put:
 *     summary: Cập nhật schedule
 *     tags: [Schedules]
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
 *               weekdays_mask:
 *                 type: integer
 *               start_at:
 *                 type: string
 *                 example: "09:00:00"
 *               end_at:
 *                 type: string
 *                 example: "11:00:00"
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/schedule/:id", auth(true), requireRole("ADMIN"), ctrl.update);

/**
 * @swagger
 * /api/v1/schedule/{id}:
 *   delete:
 *     summary: Xoá schedule
 *     tags: [Schedules]
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
 *         description: Đã xoá
 */
router.delete("/schedule/:id", auth(true), requireRole("ADMIN"), ctrl.remove);

/**
 * @swagger
 * /api/v1/schedule/generate-events:
 *   post:
 *     summary: Sinh events tự động từ schedules cho N ngày tới
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 example: 7
 *                 description: Số ngày tương lai cần sinh event (mặc định 7)
 *     responses:
 *       200:
 *         description: Số lượng events đã sinh
 */
router.post(
  "/schedule/generate-events",
  auth(true),
  requireRole("ADMIN"),
  ctrl.generateFromSchedules
);

module.exports = router;
