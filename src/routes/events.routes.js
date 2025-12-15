const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/event.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// ⬇️ Nếu validate nằm ở src/middleware/validate.js thì dùng dòng này
const validate = require("../middleware/validate");
const {
  createEventSchema,
  updateEventSchema,
  validateExistence,
} = require("../validation/event.schema");

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Quản lý ca làm cụ thể (event – ca 1 lần)
 */

/**
 * @swagger
 * /api/v1/event:
 *   get:
 *     summary: Lấy danh sách ca làm theo khoảng ngày
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Thời gian bắt đầu (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Thời gian kết thúc (ISO 8601)
 *       - in: query
 *         name: channel_id
 *         schema:
 *           type: integer
 *         required: false
 *         description: Lọc theo kênh TikTok
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: Danh sách events
 */
router.get("/event", auth(true), requireRole("ADMIN"), ctrl.list);

/**
 * @swagger
 * /api/v1/event/my:
 *   get:
 *     summary: Lịch làm của nhân viên đang đăng nhập
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Thời gian bắt đầu (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Thời gian kết thúc (ISO 8601)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: Danh sách ca làm của nhân viên hiện tại
 *       404:
 *         description: Không tìm thấy nhân viên tương ứng với tài khoản
 */
router.get(
  "/event/my",
  auth(true),
  requireRole("EMPLOYEE"),
  ctrl.listMy
);

/**
 * @swagger
 * /api/v1/event:
 *   post:
 *     summary: Tạo ca làm một lần (event)
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel_id:
 *                 type: integer
 *                 example: 1
 *               start_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-24T09:00:00Z"
 *               end_at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-24T11:00:00Z"
 *               revenue_enabled:
 *                 type: boolean
 *                 example: true
 *               schedule_id:
 *                 type: integer
 *                 nullable: true
 *                 description: Liên kết schedule cha (nếu sinh từ lịch tuần)
 *               members:
 *                 type: array
 *                 description: Danh sách nhân sự LIVE / SUPPORT
 *                 items:
 *                   type: object
 *                   properties:
 *                     employee_id:
 *                       type: integer
 *                       example: 10
 *                     role:
 *                       type: string
 *                       enum: [LIVE, SUPPORT]
 *                       example: LIVE
 *                     priority:
 *                       type: integer
 *                       example: 1
 *                     is_primary:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       201:
 *         description: Tạo event thành công
 */
router.post(
  "/event",
  auth(true),
  requireRole("ADMIN"),
  validate(createEventSchema),
  validateExistence,
  ctrl.create
);

/**
 * @swagger
 * /api/v1/event/{id}:
 *   get:
 *     summary: Xem chi tiết 1 event
 *     tags: [Events]
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
 *         description: Thông tin event
 *       404:
 *         description: Không tìm thấy
 */
router.get("/event/:id", auth(true), requireRole("ADMIN"), ctrl.get);

/**
 * @swagger
 * /api/v1/event/{id}:
 *   put:
 *     summary: Cập nhật event (giờ, nhân sự, cờ kiếm tiền...)
 *     tags: [Events]
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
 *             description: Cấu trúc giống create, nhưng các field là optional (partial update)
 *             properties:
 *               channel_id:
 *                 type: integer
 *               start_at:
 *                 type: string
 *                 format: date-time
 *               end_at:
 *                 type: string
 *                 format: date-time
 *               revenue_enabled:
 *                 type: boolean
 *               members:
 *                 type: array
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
 *     responses:
 *       200:
 *         description: Cập nhật event thành công
 */
router.put(
  "/event/:id",
  auth(true),
  requireRole("ADMIN"),
  validate(updateEventSchema),
  validateExistence,
  ctrl.update
);

/**
 * @swagger
 * /api/v1/event/{id}:
 *   delete:
 *     summary: Xoá event
 *     tags: [Events]
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
 *         description: Đã xoá event
 */
router.delete("/event/:id", auth(true), requireRole("ADMIN"), ctrl.remove);

module.exports = router;
