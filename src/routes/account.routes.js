const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const ctrl = require('../controllers/account.controller');

/**
 * @openapi
 * tags:
 *   - name: Accounts
 *     description: Quản lý tài khoản đăng nhập cho nhân viên (ADMIN)
 */

/**
 * @openapi
 * /api/v1/accounts/{id}:
 *   get:
 *     summary: Lấy thông tin tài khoản (ADMIN)
 *     description: Trả về username, trạng thái kích hoạt và danh sách role của account.
 *     tags: [Accounts]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Account không tồn tại
 */
router.get('/accounts/:id', auth(true), requireRole('ADMIN'), ctrl.getOne);

/**
 * @openapi
 * /api/v1/accounts:
 *   post:
 *     summary: Tạo tài khoản đăng nhập (ADMIN)
 *     tags: [Accounts]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:    { type: string, example: "emp001" }
 *               password:    { type: string, example: "Passw0rd!" }
 *               employee_id: { type: integer, nullable: true, example: 5 }
 *               roles:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["EMPLOYEE"]
 *     responses:
 *       201:
 *         description: Created
 *       404:
 *         description: Employee không tồn tại
 *       409:
 *         description: Username đã tồn tại hoặc employee này đã có account
 */
router.post('/accounts', auth(true), requireRole('ADMIN'), ctrl.create);

/**
 * @openapi
 * /api/v1/accounts/{id}/password:
 *   put:
 *     summary: Reset mật khẩu tài khoản (ADMIN)
 *     tags: [Accounts]
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
 *             required: [password]
 *             properties:
 *               password: { type: string, example: "NewStr0ngPass!" }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Account không tồn tại
 */
router.put('/accounts/:id/password', auth(true), requireRole('ADMIN'), ctrl.resetPassword);

/**
 * @openapi
 * /api/v1/accounts/{id}/roles:
 *   put:
 *     summary: Cập nhật vai trò (ADMIN)
 *     tags: [Accounts]
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
 *             required: [roles]
 *             properties:
 *               roles:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["EMPLOYEE"]   # hoặc ["ADMIN"]
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Account không tồn tại
 */
router.put('/accounts/:id/roles', auth(true), requireRole('ADMIN'), ctrl.updateRoles);

module.exports = router;
