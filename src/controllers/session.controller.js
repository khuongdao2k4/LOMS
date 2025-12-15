const SessionService = require("../services/session.service");
const { uploadPortrait } = require("../services/upload.service");
const { Employee } = require("../models");

class SessionController {
  static async getActive(req, res) {
    try {
      const { channel_id, employee_id } = req.query;

      const session = await SessionService.getActiveSession({
        channel_id,
        employee_id,
      });

      return res.json({ success: true, data: session });
    } catch (err) {
      console.error("[Sessions] getActive error:", err);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        message:
          err.message ||
          "Kh\u00f4ng l\u1ea5y \u0111\u01b0\u1ee3c phi\u00ean \u0111ang ho\u1ea1t \u0111\u1ed9ng",
      });
    }
  }

  // K\u00edch ho\u1ea1t ca (F4.1)
  static async activate(req, res) {
    try {
      const { tiktok_channel_id, initial_revenue, screenshot_url } = req.body;

      if (!tiktok_channel_id) {
        return res.status(400).json({
          success: false,
          message: "tiktok_channel_id is required",
        });
      }

      if (initial_revenue === undefined || initial_revenue === null) {
        return res.status(400).json({
          success: false,
          message: "initial_revenue is required",
        });
      }

      let screenshotUrl = screenshot_url;

      if (req.file) {
        const uploadResult = await uploadPortrait(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        screenshotUrl = uploadResult.url;
      } else if (!screenshotUrl) {
        return res.status(400).json({
          success: false,
          message: "screenshot file or screenshot_url is required",
        });
      }

      const result = await SessionService.activateSession({
        tiktok_channel_id,
        initial_revenue,
        screenshot_url: screenshotUrl,
      });

      return res.status(201).json({
        success: true,
        message: "Session activated successfully",
        data: result,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // K\u1ebft th\u00fac ca (F4.4) - b\u1eaft bu\u1ed9c \u1ea3nh ch\u1ee5p m\u00e0n h\u00ecnh k\u1ebft th\u00fac
  static async stop(req, res) {
    try {
      const { id } = req.params;
      const { final_revenue, screenshot_url, screenshot_end_url } = req.body;
      const sessionId = Number(id);

      if (!Number.isFinite(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "session_id kh\u00f4ng h\u1ee3p l\u1ec7",
        });
      }

      if (final_revenue === undefined || final_revenue === null) {
        return res.status(400).json({
          success: false,
          message: "final_revenue l\u00e0 b\u1eaft bu\u1ed9c khi k\u1ebft th\u00fac ca",
        });
      }

      if (final_revenue < 0) {
        return res.status(400).json({
          success: false,
          message: "final_revenue kh\u00f4ng \u0111\u01b0\u1ee3c \u00e2m",
        });
      }

      let screenshotUrl = screenshot_url || screenshot_end_url;

      if (req.file) {
        const uploadResult = await uploadPortrait(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        screenshotUrl = uploadResult.url;
      } else if (!screenshotUrl) {
        return res.status(400).json({
          success: false,
          message:
            "screenshot file ho\u1eb7c screenshot_url l\u00e0 b\u1eaft bu\u1ed9c khi k\u1ebft th\u00fac ca",
        });
      }

      const result = await SessionService.stopSession(
        sessionId,
        final_revenue,
        screenshotUrl
      );

      res.json({
        success: true,
        message: "Session stopped successfully",
        data: result,
      });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // C\u1eadp nh\u1eadt session (gi\u1edd th\u1ef1c t\u1ebf / doanh thu)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const sessionId = Number(id);
      if (!Number.isFinite(sessionId)) {
        return res
          .status(400)
          .json({ success: false, message: "session_id kh\u00f4ng h\u1ee3p l\u1ec7" });
      }

      const result = await SessionService.updateSession(sessionId, req.body);
      return res.json({
        success: true,
        message: "Session updated successfully",
        data: result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        message: err.message || "Internal server error",
      });
    }
  }

  // L\u1ecbch s\u1eed ch\u1ea5m c\u00f4ng c\u1ee7a ch\u00ednh nh\u00e2n vi\u00ean
  static async history(req, res) {
    try {
      const accountId = req.user?.sub;
      if (!accountId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized: missing account info" });
      }

      const employee = await Employee.findOne({ where: { account_id: accountId } });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Kh\u00f4ng t\u00ecm th\u1ea5y nh\u00e2n vi\u00ean g\u1eafn v\u1edbi t\u00e0i kho\u1ea3n \u0111ang \u0111\u0103ng nh\u1eadp",
        });
      }

      const { from, to, page, pageSize } = req.query;
      const data = await SessionService.getEmployeeHistory({
        employeeId: employee.id,
        from,
        to,
        page,
        pageSize,
      });

      return res.json({ success: true, data });
    } catch (err) {
      console.error("[Sessions] history error:", err);
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        message:
          err.message ||
          "Kh\u00f4ng l\u1ea5y \u0111\u01b0\u1ee3c l\u1ecbch s\u1eed ch\u1ea5m c\u00f4ng",
      });
    }
  }
}

module.exports = SessionController;
