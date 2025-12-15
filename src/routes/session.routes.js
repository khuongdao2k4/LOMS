const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/session.controller");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { upload, handleMulterError } = require("../middleware/upload");

//  Nếu bạn có validate schema cho body thì import ở đây
const validate = require("../middleware/validate");
const {
  activateBody,
  revenueBody,
  screenshotBody,
  stopBody,
  updateSessionBody,
  historyQuery,
} = require("../validation/session.schema");

router.get(
  "/sessions/active",
  auth(true),
  requireRole("EMPLOYEE", "ADMIN"),
  ctrl.getActive
);

// Lich su cham cong cua nhan vien dang dang nhap
router.get(
  "/sessions/history",
  auth(true),
  requireRole("EMPLOYEE"),
  validate(historyQuery),
  ctrl.history
);

//  Kích hoạt ca
router.post(
  "/sessions/activate",
  auth(true),
  requireRole("EMPLOYEE", "ADMIN"),
  upload.single("screenshot"), //Thêm multer
  ctrl.activate,
  handleMulterError
);
//  Kết thúc ca
router.post(
  "/sessions/:id/stop",
  auth(true),
  requireRole("EMPLOYEE", "ADMIN"),
  upload.single("screenshot"),
  validate(stopBody),
  ctrl.stop,
  handleMulterError
);

// Cập nhật session (giờ thực tế / doanh thu)
router.put(
  "/sessions/:id",
  auth(true),
  requireRole("EMPLOYEE", "ADMIN"),
  validate(updateSessionBody),
  ctrl.update
);

module.exports = router;
