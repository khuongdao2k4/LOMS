// src/routes/employee.routes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/employee.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { upload, handleMulterError } = require('../middleware/upload');

/**
 * RBAC:
 * - ADMIN: CRUD toàn bộ
 * - EMPLOYEE: chỉ được /employees/me
 */

/**
 * @openapi
 * /api/v1/employees/me:
 *   get:
 *     summary: Thông tin nhân viên đang đăng nhập
 *     tags: [Employees]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */

/**
 * @openapi
 * /api/v1/employees:
 *   get:
 *     summary: Danh sách nhân viên (ADMIN)
 *     description: |
 *       Tìm kiếm bằng một ô `q` theo:
 *       - Họ tên (`full_name`)
 *       - Quê quán (`hometown`)
 *       - Telegram ID (`telegram_id`)
 *       Có thể lọc theo trạng thái hoạt động:
 *       - `status=active` → chỉ nhân viên đang hoạt động
 *       - `status=inactive` → chỉ nhân viên đã nghỉ
 *     tags: [Employees]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, example: 20 }
 *       - in: query
 *         name: q
 *         schema: { type: string, example: "Nguyen / Ha Noi / 123456789" }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *           example: active
 *         description: Lọc theo trạng thái hoạt động của nhân viên
 *     responses:
 *       200: { description: OK }
 *
 *   post:
 *     summary: Tạo nhân viên (ADMIN) – nhận JSON hoặc multipart/form-data
 *     description: |
 *       - **JSON**: truyền đủ trường + `portrait_url` (đã upload trước).
 *       - **multipart/form-data**: gửi field text + `file` (ảnh), server upload lên R2 và tự set `portrait_url`.
 *     tags: [Employees]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, gender, date_of_birth, hometown, address, cccd, portrait_url, join_date, telegram_id]
 *             properties:
 *               full_name:     { type: string }
 *               gender:        { type: string, enum: ["MALE","FEMALE","OTHER"] }
 *               date_of_birth: { type: string, format: date }
 *               hometown:      { type: string }
 *               address:       { type: string }
 *               cccd:          { type: string }
 *               portrait_url:  { type: string }
 *               join_date:     { type: string, format: date }
 *               telegram_id:   { type: string }
 *               account_id:    { type: integer, nullable: true }
 *               is_active:     { type: boolean }
 *               experience:    { type: string }
 *               note:          { type: string }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [full_name, gender, date_of_birth, hometown, address, cccd, join_date, telegram_id, file]
 *             properties:
 *               full_name:     { type: string }
 *               gender:        { type: string, enum: ["MALE","FEMALE","OTHER"] }
 *               date_of_birth: { type: string, format: date }
 *               hometown:      { type: string }
 *               address:       { type: string }
 *               cccd:          { type: string }
 *               join_date:     { type: string, format: date }
 *               telegram_id:   { type: string }
 *               is_active:     { type: boolean }
 *               account_id:    { type: string, description: "Để trống → null" }
 *               experience:    { type: string }
 *               note:          { type: string }
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201: { description: Created }
 */

/**
 * @openapi
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Xem chi tiết nhân viên (ADMIN)
 *     tags: [Employees]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *   put:
 *     summary: Cập nhật nhân viên (ADMIN) – hỗ trợ kèm file ảnh
 *     tags: [Employees]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:     { type: string }
 *               gender:        { type: string, enum: ["MALE","FEMALE","OTHER"] }
 *               date_of_birth: { type: string, format: date }
 *               hometown:      { type: string }
 *               address:       { type: string }
 *               cccd:          { type: string }
 *               portrait_url:  { type: string }
 *               join_date:     { type: string, format: date }
 *               telegram_id:   { type: string }
 *               account_id:    { type: integer, nullable: true }
 *               is_active:     { type: boolean }
 *               experience:    { type: string }
 *               note:          { type: string }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:     { type: string }
 *               gender:        { type: string, enum: ["MALE","FEMALE","OTHER"] }
 *               date_of_birth: { type: string, format: date }
 *               hometown:      { type: string }
 *               address:       { type: string }
 *               cccd:          { type: string }
 *               join_date:     { type: string, format: date }
 *               telegram_id:   { type: string }
 *               account_id:    { type: integer, nullable: true }
 *               is_active:     { type: boolean }
 *               experience:    { type: string }
 *               note:          { type: string }
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     summary: Xóa nhân viên (ADMIN)
 *     tags: [Employees]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: No Content }
 */

// EMPLOYEE xem hồ sơ của chính mình
router.get('/employees/me', auth(true), ctrl.me);

// ADMIN CRUD
router.get('/employees',     auth(true), requireRole('ADMIN'), ctrl.list);
router.get('/employees/:id', auth(true), requireRole('ADMIN'), ctrl.get);

// Create: nhận JSON hoặc multipart (kèm file)
router.post(
  '/employees',
  auth(true),
  requireRole('ADMIN'),
  upload.single('file'),
  handleMulterError,
  ctrl.create
);

// Update: hỗ trợ kèm file
router.put(
  '/employees/:id',
  auth(true),
  requireRole('ADMIN'),
  upload.single('file'),
  handleMulterError,
  ctrl.update
);

router.delete('/employees/:id', auth(true), requireRole('ADMIN'), ctrl.remove);

module.exports = router;
