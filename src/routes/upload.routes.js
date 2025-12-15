const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/upload.controller');
const { upload, handleMulterError } = require('../middleware/upload');
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

/**
 * @openapi
 * /api/v1/uploads/portrait:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload ảnh chân dung lên R2 (ADMIN/EMPLOYEE)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công, trả URL public
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 *                 key: { type: string }
 */
router.post(
  '/uploads/portrait',
  auth(true),
  requireRole('ADMIN', 'EMPLOYEE'),
  upload.single('file'),
  ctrl.uploadPortrait,
  handleMulterError
);

/**
 * @openapi
 * /api/v1/uploads/screenshot:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload ảnh screenshot lên R2 (ADMIN/EMPLOYEE)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload thành công, trả URL public
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 *                 key: { type: string }
 */
router.post(
  '/uploads/screenshot',
  auth(true),
  requireRole('ADMIN', 'EMPLOYEE'),
  upload.single('file'),
  ctrl.uploadScreenshot,
  handleMulterError
);

module.exports = router;
