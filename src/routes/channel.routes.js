// src/routes/channel.routes.js
const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/channel.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// ⬇️ Nếu validate nằm ở src/middleware/validate.js thì dùng dòng này
const validate = require('../middleware/validate');

// ⬇️ Nếu bạn để validate ở src/validation/validate.js thì thay bằng:
// const validate = require('../validation/validate');

const { listQuery, createBody, updateBody } = require('../validation/channel.schema');

/**
 * @openapi
 * /api/v1/channels:
 *   get:
 *     tags: [Channels]
 *     summary: Danh sách kênh (ADMIN) – hỗ trợ tìm kiếm bằng q (name hoặc tiktok_channel_id)
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
 *   post:
 *     tags: [Channels]
 *     summary: Tạo kênh (ADMIN)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tiktok_channel_id, name]
 *             properties:
 *               tiktok_channel_id:
 *                 type: string
 *                 example: "ttk_001"
 *               name:
 *                 type: string
 *                 example: "Kênh A"
 *     responses:
 *       201:
 *         description: Created
 *
 * /api/v1/channels/{id}:
 *   get:
 *     tags: [Channels]
 *     summary: Xem chi tiết kênh (ADMIN)
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
 *   put:
 *     tags: [Channels]
 *     summary: Cập nhật kênh (ADMIN)
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
 *               tiktok_channel_id:
 *                 type: string
 *                 example: "ttk_001"
 *               name:
 *                 type: string
 *                 example: "Kênh A"
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     tags: [Channels]
 *     summary: Xóa kênh (ADMIN)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: No Content
 */

router.get(
  '/channels',
  auth(true),
  requireRole('ADMIN'),
  validate(listQuery),
  ctrl.list
);

router.post(
  '/channels',
  auth(true),
  requireRole('ADMIN'),
  validate(createBody),
  ctrl.create
);

router.get(
  '/channels/:id',
  auth(true),
  requireRole('ADMIN'),
  ctrl.get
);

router.put(
  '/channels/:id',
  auth(true),
  requireRole('ADMIN'),
  validate(updateBody),
  ctrl.update
);

router.delete(
  '/channels/:id',
  auth(true),
  requireRole('ADMIN'),
  ctrl.remove
);

module.exports = router;
