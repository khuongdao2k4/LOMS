const bcrypt = require('bcrypt');
const { sequelize, Account, Role, AccountRole, Employee } = require('../models');

async function createAccount({ username, password, employee_id, roles }) {
  const t = await sequelize.transaction();
  try {
    // 1) unique username
    const existed = await Account.findOne({ where: { username }, transaction: t, lock: t.LOCK.UPDATE });
    if (existed) throw new Error('USERNAME_TAKEN');

    // 2) create account
    const password_hash = await bcrypt.hash(password, 10);
    const acc = await Account.create(
      { username, password_hash, is_active: true },
      { transaction: t }
    );

    // 3) roles (default EMPLOYEE)
    const roleCodes = Array.isArray(roles) && roles.length ? roles : ['EMPLOYEE'];
    const roleRows = await Role.findAll({ where: { code: roleCodes }, transaction: t });
    if (roleRows.length) {
      await AccountRole.bulkCreate(
        roleRows.map(r => ({ account_id: acc.id, role_id: r.id })),
        { transaction: t }
      );
    }

    // 4) optionally link employee
    let employee = null;
    if (employee_id) {
      employee = await Employee.findByPk(employee_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!employee) throw new Error('EMP_NOT_FOUND');
      if (employee.account_id) throw new Error('EMP_ALREADY_LINKED');

      employee.account_id = acc.id;
      await employee.save({ transaction: t });
    }

    await t.commit();
    return {
      account: { id: acc.id, username: acc.username, roles: roleRows.map(r => r.code) },
      employee
    };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function resetPassword(accountId, newPassword) {
  const acc = await Account.findByPk(accountId);
  if (!acc) return null;
  acc.password_hash = await bcrypt.hash(newPassword, 10);
  await acc.save();
  return true;
}

async function updateRoles(accountId, roles) {
  const acc = await Account.findByPk(accountId);
  if (!acc) return null;

  const roleRows = await Role.findAll({ where: { code: roles || [] } });
  // clear then set
  await AccountRole.destroy({ where: { account_id: accountId } });
  if (roleRows.length) {
    await AccountRole.bulkCreate(
      roleRows.map(r => ({ account_id: accountId, role_id: r.id }))
    );
  }
  return { id: acc.id, roles: roleRows.map(r => r.code) };
}

/**
 * Lấy thông tin public của account (username + is_active + roles)
 * KHÔNG bao giờ trả password_hash.
 */
async function getAccountPublic(accountId) {
  const acc = await Account.findByPk(accountId, {
    include: [
      {
        model: Role,
        as: 'roles',
        through: { attributes: [] },
      },
    ],
  });

  if (!acc) return null;

  return {
    id: acc.id,
    username: acc.username,
    is_active: acc.is_active,
    roles: (acc.roles || []).map(r => r.code),
  };
}

module.exports = {
  createAccount,
  resetPassword,
  updateRoles,
  getAccountPublic,
};
