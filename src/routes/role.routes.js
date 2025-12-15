const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/role.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Chỉ ADMIN được thao tác quản trị role
router.get('/roles', auth(), requireRole('ADMIN'), ctrl.list);
router.get('/accounts/:accountId/roles', auth(), requireRole('ADMIN'), ctrl.getAccountRoles);
router.post('/accounts/:accountId/roles/assign', auth(), requireRole('ADMIN'), ctrl.assign);
router.delete('/accounts/:accountId/roles/:roleCode', auth(), requireRole('ADMIN'), ctrl.remove);
// replace toàn bộ role của account
router.put('/accounts/:accountId/roles', auth(), requireRole('ADMIN'), ctrl.replace);

module.exports = router;
