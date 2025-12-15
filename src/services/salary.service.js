// src/services/salary.service.js
const { Op } = require("sequelize");
const { SalaryConfig } = require("../models");

/**
 * Danh sách cấu hình lương (có paginate + search theo employee)
 */
async function list({ page = 1, pageSize = 20, q }) {
  page = Number(page) || 1;
  pageSize = Number(pageSize) || 20;

  const where = {};
  if (q) {
    const like = `%${q}%`;
    Object.assign(where, {
      [Op.or]: [
        { "$employee.full_name$": { [Op.iLike]: like } },
        { "$employee.telegram_id$": { [Op.iLike]: like } },
      ],
    });
  }

  const { rows, count } = await SalaryConfig.findAndCountAll({
    where,
    include: [{ association: "employee" }],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [["id", "DESC"]],
  });

  return {
    data: rows,
    pagination: { page, pageSize, total: count },
  };
}

/**
 * Lấy cấu hình lương theo id (primary key)
 * GET /salary-configs/:id
 */
function getById(id) {
  return SalaryConfig.findByPk(id, {
    include: [{ association: "employee" }],
  });
}

/**
 * Lấy cấu hình lương theo employee_id
 * GET /salary-configs/by-employee/:employee_id
 */
function getByEmployeeId(employee_id) {
  return SalaryConfig.findOne({
    where: { employee_id },
    include: [{ association: "employee" }],
  });
}

/**
 * Cập nhật một phần salary config (PATCH)
 * cho phép update: base_salary, hourly_rate_live, hourly_rate_support
 */
async function updatePartial(id, payload) {
  const cfg = await SalaryConfig.findByPk(id);
  if (!cfg) return null;

  await cfg.update({
    base_salary:
      payload.base_salary !== undefined ? payload.base_salary : cfg.base_salary,
    hourly_rate_live:
      payload.hourly_rate_live !== undefined
        ? payload.hourly_rate_live
        : cfg.hourly_rate_live,
    hourly_rate_support:
      payload.hourly_rate_support !== undefined
        ? payload.hourly_rate_support
        : cfg.hourly_rate_support,
    // KHÔNG update is_active nữa
  });

  // Trả lại đầy đủ kèm employee
  return getById(id);
}

/**
 * Xoá cấu hình lương
 */
async function remove(id) {
  const n = await SalaryConfig.destroy({ where: { id } });
  return n > 0;
}

module.exports = {
  list,
  getById,
  getByEmployeeId,
  updatePartial,
  remove,
};
