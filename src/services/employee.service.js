// src/services/employee.service.js
const { Op } = require('sequelize');
const { Employee, SalaryConfig, sequelize } = require('../models');

/**
 * Danh sách nhân viên với:
 * - Phân trang: page, pageSize
 * - Tìm kiếm q (full_name / hometown / telegram_id)
 * - Lọc trạng thái hoạt động: status = "active" | "inactive" | ""
 */
async function listEmployees({ page = 1, pageSize = 20, q, status }) {
  page = Number(page) || 1;
  pageSize = Number(pageSize) || 20;

  const where = {};

  // Tìm kiếm theo q
  if (q) {
    const like = `%${q}%`;
    Object.assign(where, {
      [Op.or]: [
        { full_name:   { [Op.iLike]: like } },
        { hometown:    { [Op.iLike]: like } },
        { telegram_id: { [Op.iLike]: like } },
      ],
    });
  }

  // Lọc trạng thái theo query "status"
  // FE gửi: "active" -> is_active = true, "inactive" -> is_active = false
  if (status === 'active') {
    where.is_active = true;
  } else if (status === 'inactive') {
    where.is_active = false;
  }
  // status = "" hoặc không truyền -> không filter theo trạng thái

  const { rows, count } = await Employee.findAndCountAll({
    where,
    include: [
      {
        model: SalaryConfig,
        as: 'salaryConfig',
        // Chỉ select các cột THỰC SỰ có trong bảng salary_configs
        // và bỏ hẳn "is_active" vì DB không có cột này
        attributes: [
          'id',
          'employee_id',
          'base_salary',
          'hourly_rate_live',
          'hourly_rate_support',
          'created_at',
        ],
      },
    ],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['id', 'DESC']],
  });

  return {
    data: rows,
    pagination: { page, pageSize, total: count },
  };
}

/**
 * Lấy chi tiết 1 nhân viên kèm salaryConfig
 */
async function getEmployeeById(id) {
  return Employee.findByPk(id, {
    include: [
      {
        model: SalaryConfig,
        as: 'salaryConfig',
        attributes: [
          'id',
          'employee_id',
          'base_salary',
          'hourly_rate_live',
          'hourly_rate_support',
          'created_at',
        ],
      },
    ],
  });
}

/**
 * Tạo nhân viên + SalaryConfig mặc định (0)
 */
async function create(payload) {
  // Transaction -> tạo Employee + SalaryConfig mặc định
  return await sequelize.transaction(async (t) => {
    const emp = await Employee.create(
      {
        full_name:     payload.full_name,
        gender:        payload.gender,
        date_of_birth: payload.date_of_birth, // 'YYYY-MM-DD'
        hometown:      payload.hometown,
        address:       payload.address,
        cccd:          payload.cccd,
        portrait_url:  payload.portrait_url,
        join_date:     payload.join_date,
        telegram_id:   payload.telegram_id,
        account_id:    payload.account_id ?? null,
        is_active:     payload.is_active ?? true,
        experience:    payload.experience ?? null,
        note:          payload.note ?? null,
      },
      { transaction: t }
    );

    await SalaryConfig.create(
      {
        employee_id:         emp.id,
        base_salary:         0,
        hourly_rate_live:    0,
        hourly_rate_support: 0,
      },
      { transaction: t }
    );

    return Employee.findByPk(emp.id, {
      include: [
        {
          model: SalaryConfig,
          as: 'salaryConfig',
          attributes: [
            'id',
            'employee_id',
            'base_salary',
            'hourly_rate_live',
            'hourly_rate_support',
            'created_at',
          ],
        },
      ],
      transaction: t,
    });
  });
}

/**
 * Cập nhật thông tin nhân viên
 */
async function updateEmployee(id, payload) {
  const emp = await Employee.findByPk(id);
  if (!emp) return null;

  await emp.update({
    full_name:     payload.full_name ?? emp.full_name,
    gender:        payload.gender ?? emp.gender,
    date_of_birth: payload.date_of_birth ?? emp.date_of_birth,
    hometown:      payload.hometown ?? emp.hometown,
    address:       payload.address ?? emp.address,
    cccd:          payload.cccd ?? emp.cccd,
    portrait_url:  payload.portrait_url ?? emp.portrait_url,
    join_date:     payload.join_date ?? emp.join_date,
    telegram_id:   payload.telegram_id ?? emp.telegram_id,
    account_id:    payload.account_id ?? emp.account_id,
    is_active:     payload.is_active ?? emp.is_active,
    experience:    payload.experience ?? emp.experience,
    note:          payload.note ?? emp.note,
  });

  return Employee.findByPk(id, {
    include: [
      {
        model: SalaryConfig,
        as: 'salaryConfig',
        attributes: [
          'id',
          'employee_id',
          'base_salary',
          'hourly_rate_live',
          'hourly_rate_support',
          'created_at',
        ],
      },
    ],
  });
}

/**
 * Xóa nhân viên
 */
async function deleteEmployee(id) {
  const count = await Employee.destroy({ where: { id } });
  return count > 0;
}

/**
 * Lấy thông tin "nhân viên của tài khoản đang đăng nhập"
 */
async function getMe(accountId) {
  return Employee.findOne({
    where: { account_id: accountId },
    include: [
      {
        model: SalaryConfig,
        as: 'salaryConfig',
        attributes: [
          'id',
          'employee_id',
          'base_salary',
          'hourly_rate_live',
          'hourly_rate_support',
          'created_at',
        ],
      },
    ],
  });
}

module.exports = {
  listEmployees,
  getEmployeeById,
  create,
  updateEmployee,
  deleteEmployee,
  getMe,
};
