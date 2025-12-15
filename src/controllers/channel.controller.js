const svc = require('../services/channel.service');

module.exports = {
  async list(req, res) {
    try {
      const { page, pageSize, q } = req.query;
      const out = await svc.list({ page, pageSize, q });
      res.json(out);
    } catch (e) {
      console.error('[CHANNEL/LIST]', e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async get(req, res) {
    try {
      const ch = await svc.get(req.params.id);
      if (!ch) return res.status(404).json({ message: 'Not found' });
      res.json(ch);
    } catch (e) {
      console.error('[CHANNEL/GET]', e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async create(req, res) {
    try {
      const ch = await svc.create(req.body);
      res.status(201).json(ch);
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'tiktok_channel_id already exists' });
      }
      console.error('[CHANNEL/CREATE]', e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async update(req, res) {
    try {
      const ch = await svc.update(req.params.id, req.body);
      if (!ch) return res.status(404).json({ message: 'Not found' });
      res.json(ch);
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'tiktok_channel_id already exists' });
      }
      console.error('[CHANNEL/UPDATE]', e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async remove(req, res) {
    try {
      const ok = await svc.remove(req.params.id);
      if (!ok) return res.status(404).json({ message: 'Not found' });
      res.status(204).send();
    } catch (e) {
      console.error('[CHANNEL/DELETE]', e);
      res.status(500).json({ message: 'Internal error' });
    }
  },
};
