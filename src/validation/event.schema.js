const Joi = require("joi");
const { Channel, Employee } = require("../models");

// ✅ Schema tạo event - F3.2 + F3.3
const createEventSchema = Joi.object({
  channel_id: Joi.number().integer().required(),
  start_at: Joi.date().iso().required(),
  end_at: Joi.date().iso().greater(Joi.ref("start_at")).required(),
  schedule_id: Joi.number().integer().allow(null),

  revenue_enabled: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .default(true),

  is_active: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .default(true),

  members: Joi.array()
    .items(
      Joi.object({
        employee_id: Joi.number().integer().required(),
        role: Joi.string().valid("LIVE", "SUPPORT").required(),
        priority: Joi.number().integer().allow(null),
        is_primary: Joi.boolean().default(false),
      })
    )
    // ❗ Sửa: không bắt buộc nữa, default [] để schedule auto tạo event không cần member
    .default([])
    .custom((value, helpers) => {
      // Nếu chưa gán thành viên (event auto từ schedule) → cho qua
      if (!value || value.length === 0) {
        return value;
      }

      // ✅ Kiểm tra không có duplicate member
      const seen = new Set();
      for (const member of value) {
        const key = `${member.employee_id}-${member.role}`;
        if (seen.has(key)) {
          return helpers.message(
            `Duplicate member: employee_id ${member.employee_id} with role ${member.role}`
          );
        }
        seen.add(key);
      }

      // ✅ F3.2: Nếu đã có members thì bắt buộc phải có ít nhất 1 LIVE member
      const hasLive = value.some((m) => m.role === "LIVE");
      if (!hasLive) {
        return helpers.message("Event must have at least one LIVE member");
      }

      // ✅ Kiểm tra chỉ có 1 primary per role
      const primaryByRole = {};
      for (const member of value) {
        if (member.is_primary) {
          if (primaryByRole[member.role]) {
            return helpers.message(
              `Only one primary member allowed per role. Found multiple primary for role: ${member.role}`
            );
          }
          primaryByRole[member.role] = true;
        }
      }

      return value;
    }),
});

// ✅ Schema update event - F3.4.3
const updateEventSchema = Joi.object({
  channel_id: Joi.number().integer(),

  // ⚠️ start_at: Sẽ bị reject ở service nếu event đã bắt đầu
  start_at: Joi.date().iso(),

  end_at: Joi.date().iso(),
  schedule_id: Joi.number().integer().allow(null),

  revenue_enabled: Joi.alternatives().try(
    Joi.boolean(),
    Joi.number().valid(0, 1)
  ),

  is_active: Joi.alternatives().try(Joi.boolean(), Joi.number().valid(0, 1)),

  members: Joi.array()
    .items(
      Joi.object({
        employee_id: Joi.number().integer().required(),
        role: Joi.string().valid("LIVE", "SUPPORT").required(),
        priority: Joi.number().integer().allow(null),
        is_primary: Joi.boolean(),
      })
    )
    .custom((value, helpers) => {
      // Nếu không gửi members khi update → không kiểm tra gì thêm
      if (!value || value.length === 0) return value;

      // Kiểm tra không có duplicate member
      const seen = new Set();
      for (const member of value) {
        const key = `${member.employee_id}-${member.role}`;
        if (seen.has(key)) {
          return helpers.message(
            `Duplicate member: employee_id ${member.employee_id} with role ${member.role}`
          );
        }
        seen.add(key);
      }

      // Nếu có members thì phải có ít nhất 1 LIVE
      const hasLive = value.some((m) => m.role === "LIVE");
      if (!hasLive) {
        return helpers.message("Event must have at least one LIVE member");
      }

      // Kiểm tra chỉ có 1 primary per role
      const primaryByRole = {};
      for (const member of value) {
        if (member.is_primary) {
          if (primaryByRole[member.role]) {
            return helpers.message(
              `Only one primary member allowed per role. Found multiple primary for role: ${member.role}`
            );
          }
          primaryByRole[member.role] = true;
        }
      }

      return value;
    }),
}).min(1);

// ✅ Middleware kiểm tra tồn tại channel & employee
async function validateExistence(req, res, next) {
  try {
    const { channel_id, members } = req.body;

    // Kiểm tra channel tồn tại
    if (channel_id) {
      const channel = await Channel.findByPk(channel_id);
      if (!channel) {
        return res.status(400).json({
          success: false,
          message: `Channel ${channel_id} not found`,
        });
      }
    }

    // Kiểm tra tất cả employees tồn tại (nếu có truyền members)
    if (members && Array.isArray(members)) {
      for (const m of members) {
        const emp = await Employee.findByPk(m.employee_id);
        if (!emp) {
          return res.status(400).json({
            success: false,
            message: `Employee ${m.employee_id} not found`,
          });
        }
      }
    }

    next();
  } catch (err) {
    console.error("❌ validateExistence error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}

module.exports = {
  createEventSchema,
  updateEventSchema,
  validateExistence,
};
