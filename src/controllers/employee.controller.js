// src/controllers/employee.controller.js
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2, buildPublicUrl } = require('../config/r2');
const empSvc = require('../services/employee.service');

// upload ảnh lên R2 khi nhận multipart
async function uploadPortraitToR2(buffer, filename, mimetype) {
  const { v4: uuid } = require('uuid');
  const ext = (filename || '').split('.').pop() || 'jpg';
  const key = `portraits/${uuid()}.${ext}`;

  const putCmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
    ACL: 'public-read', // nếu bucket public
  });
  await r2.send(putCmd);

  return {
    key,
    // ✅ chỉ truyền key, buildPublicUrl tự dùng base/endpoint
    url: buildPublicUrl(key),
  };
}

module.exports = {
  async list(req, res) {
    try {
      const { page, pageSize, q, status } = req.query;
      const out = await empSvc.listEmployees({ page, pageSize, q, status });
      res.json(out);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async get(req, res) {
    try {
      const emp = await empSvc.getEmployeeById(req.params.id);
      if (!emp) return res.status(404).json({ message: 'Not found' });
      res.json(emp);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async create(req, res) {
    try {
      const isMultipart = !!req.file;
      const body = { ...req.body };

      // account_id: '' -> null
      if (body.account_id === '' || body.account_id === undefined)
        body.account_id = null;

      // YYYY-MM-DD
      if (typeof body.date_of_birth === 'string')
        body.date_of_birth = body.date_of_birth.replace(/\//g, '-');
      if (typeof body.join_date === 'string')
        body.join_date = body.join_date.replace(/\//g, '-');

      if (isMultipart) {
        const { buffer, originalname, mimetype } = req.file;
        const { url } = await uploadPortraitToR2(buffer, originalname, mimetype);
        body.portrait_url = url; // tự set link ảnh
      }

      const created = await empSvc.create(body);
      return res.status(201).json(created);
    } catch (e) {
      console.error('[EMPLOYEE/CREATE]', e);
      return res.status(500).json({ message: 'Internal error' });
    }
  },

  async update(req, res) {
    try {
      const body = { ...req.body };

      if (body.account_id === '') body.account_id = null;
      if (typeof body.date_of_birth === 'string')
        body.date_of_birth = body.date_of_birth.replace(/\//g, '-');
      if (typeof body.join_date === 'string')
        body.join_date = body.join_date.replace(/\//g, '-');

      if (req.file) {
        const { buffer, originalname, mimetype } = req.file;
        const { url } = await uploadPortraitToR2(buffer, originalname, mimetype);
        body.portrait_url = url;
      }

      const emp = await empSvc.updateEmployee(req.params.id, body);
      if (!emp) return res.status(404).json({ message: 'Not found' });
      res.json(emp);
    } catch (e) {
      if (e.name === 'SequelizeUniqueConstraintError') {
        return res
          .status(409)
          .json({ message: 'CCCD/Telegram ID đã tồn tại' });
      }
      console.error(e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async remove(req, res) {
    try {
      const ok = await empSvc.deleteEmployee(req.params.id);
      if (!ok) return res.status(404).json({ message: 'Not found' });
      res.status(204).end();
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Internal error' });
    }
  },

  async me(req, res) {
    try {
      const me = await empSvc.getMe(req.user.sub);
      if (!me)
        return res
          .status(404)
          .json({ message: 'Không tìm thấy hồ sơ nhân viên cho tài khoản này' });
      res.json(me);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Internal error' });
    }
  },
};
