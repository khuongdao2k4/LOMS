// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { AuthSession } = require('../models');

module.exports = function auth(required = true) {
  return async (req, res, next) => {
    try {
      const hdr = req.headers.authorization || '';
      const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;

      if (!token) {
        if (!required) return next();
        return res.status(401).json({ message: 'Missing access token' });
      }

      const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      if (!payload?.sub || !payload?.jti) {
        return res.status(401).json({ message: 'Invalid token payload' });
      }

      const now = new Date();
      const sess = await AuthSession.findOne({
        where: {
          account_id: payload.sub,
          jti_access: payload.jti,
          is_revoked: false,
          expires_at: { [Op.gt]: now },
        },
      });

      if (!sess) {
        return res.status(401).json({ message: 'Access token has been revoked' });
      }

      req.user = payload; // { sub, roles, jti, ... }
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid/expired token' });
    }
  };
};
