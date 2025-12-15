const { Account, Role, AccountRole } = require('../models');

async function listRoles() {
  return Role.findAll({ order: [['id', 'ASC']] });
}

async function getAccountRoles(accountId) {
  const acc = await Account.findByPk(accountId, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
  });
  if (!acc) throw new Error('ACCOUNT_NOT_FOUND');
  return acc.roles;
}

async function assignRole(accountId, roleCode) {
  const acc = await Account.findByPk(accountId);
  if (!acc) throw new Error('ACCOUNT_NOT_FOUND');

  const role = await Role.findOne({ where: { code: roleCode } });
  if (!role) throw new Error('ROLE_NOT_FOUND');

  await AccountRole.findOrCreate({ where: { account_id: acc.id, role_id: role.id } });
  return true;
}

async function removeRole(accountId, roleCode) {
  const role = await Role.findOne({ where: { code: roleCode } });
  if (!role) throw new Error('ROLE_NOT_FOUND');
  await AccountRole.destroy({ where: { account_id: accountId, role_id: role.id } });
  return true;
}

// (tuỳ chọn) set danh sách role cho account (replace all)
async function replaceRoles(accountId, roleCodes = []) {
  const acc = await Account.findByPk(accountId);
  if (!acc) throw new Error('ACCOUNT_NOT_FOUND');

  const roles = await Role.findAll({ where: { code: roleCodes } });
  const roleIds = roles.map(r => r.id);

  // transaction nhẹ
  await AccountRole.destroy({ where: { account_id: accountId } });
  if (roleIds.length) {
    await AccountRole.bulkCreate(roleIds.map(rid => ({ account_id: accountId, role_id: rid })));
  }
  return true;
}

module.exports = {
  listRoles,
  getAccountRoles,
  assignRole,
  removeRole,
  replaceRoles
};
