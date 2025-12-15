const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Đăng nhập (trả về accessToken + refreshToken)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin1 }
 *               password: { type: string, example: admin123 }
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken: { type: string }
 *                 refreshToken: { type: string }
 *                 account:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 1 }
 *                     username: { type: string, example: admin1 }
 *                     roles:
 *                       type: array
 *                       items: { type: string }
 *
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Đổi cặp token mới bằng refreshToken (rotate & revoke cặp cũ)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Trả về accessToken/refreshToken mới
 *
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout (revoke refreshToken hiện tại)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Đã logout
 */

router.post('/auth/login',   ctrl.login);
router.post('/auth/refresh', ctrl.refresh);
router.post('/auth/logout',  ctrl.logout);

module.exports = router;
