const svc = require('../services/account.service');

module.exports = {
  async create(req, res) {
    try {
      const out = await svc.createAccount(req.body);
      return res.status(201).json(out);
    } catch (e) {
      if (e.message === 'USERNAME_TAKEN')      return res.status(409).json({ message: 'Username đã tồn tại' });
      if (e.message === 'EMP_NOT_FOUND')       return res.status(404).json({ message: 'Employee không tồn tại' });
      if (e.message === 'EMP_ALREADY_LINKED')  return res.status(409).json({ message: 'Employee đã có account' });
      console.error('[ACCOUNTS/CREATE]', e);
      return res.status(500).json({ message: 'Internal error' });
    }
  },

  async resetPassword(req, res) {
    try {
      const out = await svc.resetPassword(Number(req.params.id), req.body.password);
      if (!out) return res.status(404).json({ message: 'Account không tồn tại' });
      return res.json({ success: true });
    } catch (e) {
      console.error('[ACCOUNTS/RESET_PASSWORD]', e);
      return res.status(500).json({ message: 'Internal error' });
    }
  },

  async updateRoles(req, res) {
    try {
      const out = await svc.updateRoles(Number(req.params.id), req.body.roles);
      if (!out) return res.status(404).json({ message: 'Account không tồn tại' });
      return res.json(out);
    } catch (e) {
      console.error('[ACCOUNTS/UPDATE_ROLES]', e);
      return res.status(500).json({ message: 'Internal error' });
    }
  },

  /**
   * GET /api/v1/accounts/:id
   * Trả về: { id, username, is_active, roles[] }
   */
  async getOne(req, res) {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return res.status(400).json({ message: 'Invalid account id' });
      }

      const acc = await svc.getAccountPublic(id);
      if (!acc) {
        return res.status(404).json({ message: 'Account không tồn tại' });
      }

      return res.json(acc);
    } catch (e) {
      console.error('[ACCOUNTS/GET_ONE]', e);
      return res.status(500).json({ message: 'Internal error' });
    }
  },
};
