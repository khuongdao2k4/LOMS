const svc = require('../services/auth.service');

module.exports = {
  async login(req, res) {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ message: 'Thiếu username/password' });
      }

      // Kiểm tra cấu hình JWT
      if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
        console.error('[AUTH/LOGIN] Missing JWT secrets in ENV');
        return res.status(500).json({ message: 'JWT secrets are not configured' });
      }

      const out = await svc.login({
        username,
        password,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      return res.json(out);
    } catch (e) {
      console.error('[AUTH/LOGIN]', e?.message, e?.stack);
      if (e.message === 'INVALID_CREDENTIALS') return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });
      if (e.message === 'ACCOUNT_INACTIVE')   return res.status(403).json({ message: 'Tài khoản đã bị khoá' });
      return res.status(500).json({ message: 'Internal error' });
    }
  },

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return res.status(400).json({ message: 'Thiếu refreshToken' });

      const out = await svc.refresh({
        refreshToken,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      return res.json(out);
    } catch (e) {
      console.error('[AUTH/REFRESH]', e?.message, e?.stack);
      if (e.message === 'INVALID_REFRESH')              return res.status(401).json({ message: 'Refresh token không hợp lệ/hết hạn' });
      if (e.message === 'REFRESH_NOT_FOUND_OR_REVOKED') return res.status(401).json({ message: 'Refresh token đã bị thu hồi' });
      if (e.message === 'ACCOUNT_INACTIVE')             return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
      return res.status(500).json({ message: 'Internal error' });
    }
  },

  async logout(req, res) {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken) return res.status(400).json({ message: 'Thiếu refreshToken' });

      const out = await svc.logout({ refreshToken });
      return res.json(out);
    } catch (e) {
      console.error('[AUTH/LOGOUT]', e?.message, e?.stack);
      return res.status(500).json({ message: 'Internal error' });
    }
  }
};
