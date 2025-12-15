const svc = require('../services/role.service');

module.exports = {
  async list(req, res) {
    const roles = await svc.listRoles();
    res.json(roles);
  },

  async getAccountRoles(req, res) {
    try {
      const { accountId } = req.params;
      const roles = await svc.getAccountRoles(accountId);
      res.json(roles);
    } catch (e) {
      if (e.message === 'ACCOUNT_NOT_FOUND') return res.status(404).json({ message: 'Account not found' });
      throw e;
    }
  },

  async assign(req, res) {
    try {
      const { accountId } = req.params;
      const { roleCode } = req.body;
      if (!roleCode) return res.status(400).json({ message: 'roleCode is required' });
      await svc.assignRole(accountId, roleCode);
      res.json({ success: true });
    } catch (e) {
      if (e.message === 'ACCOUNT_NOT_FOUND') return res.status(404).json({ message: 'Account not found' });
      if (e.message === 'ROLE_NOT_FOUND') return res.status(404).json({ message: 'Role not found' });
      throw e;
    }
  },

  async remove(req, res) {
    try {
      const { accountId } = req.params;
      const { roleCode } = req.params; // từ URL
      await svc.removeRole(accountId, roleCode);
      res.json({ success: true });
    } catch (e) {
      if (e.message === 'ROLE_NOT_FOUND') return res.status(404).json({ message: 'Role not found' });
      throw e;
    }
  },

  async replace(req, res) {
    try {
      const { accountId } = req.params;
      const { roleCodes } = req.body; // array
      if (!Array.isArray(roleCodes)) return res.status(400).json({ message: 'roleCodes must be array' });
      await svc.replaceRoles(accountId, roleCodes);
      res.json({ success: true });
    } catch (e) {
      if (e.message === 'ACCOUNT_NOT_FOUND') return res.status(404).json({ message: 'Account not found' });
      throw e;
    }
  }
};
