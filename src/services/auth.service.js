// src/services/auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // hoặc bcryptjs
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Account, Role, AuthSession } = require('../models');

const ACCESS_TTL = '4h';
const REFRESH_TTL_MS = 7 * 60 * 60 * 1000; // 7h

function genJti() { return crypto.randomBytes(16).toString('hex'); }

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TTL });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7h' });
}

async function loadAccountWithRolesByUsername(username) {
  return Account.findOne({
    where: { username },
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
  });
}
async function loadAccountWithRolesById(id) {
  return Account.findByPk(id, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
  });
}

async function createSession(accountId, refreshToken, { userAgent, ip }, { jtiAccess, jtiRefresh }) {
  const hash = await bcrypt.hash(refreshToken, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  return AuthSession.create({
    account_id: accountId,
    refresh_token_hash: hash,
    user_agent: userAgent?.slice(0, 500),
    ip_address: ip?.slice(0, 100),
    is_revoked: false,
    expires_at: expiresAt,
    jti_access: jtiAccess,
    jti_refresh: jtiRefresh
  });
}

async function findValidSessionByRefresh(accountId, refreshToken) {
  const sessions = await AuthSession.findAll({
    where: {
      account_id: accountId,
      is_revoked: false,
      expires_at: { [Op.gt]: new Date() }
    },
    order: [['id', 'DESC']]
  });

  for (const s of sessions) {
    const ok = await bcrypt.compare(refreshToken, s.refresh_token_hash);
    if (ok) return s;
  }
  return null;
}

async function revokeSession(session, replacedById = null) {
  session.is_revoked = true;
  session.revoked_at = new Date();
  if (replacedById) session.replaced_by = replacedById;
  await session.save();
}

async function login({ username, password, userAgent, ip }) {
  const account = await loadAccountWithRolesByUsername(username);
  if (!account) throw new Error('INVALID_CREDENTIALS');
  if (!account.is_active) throw new Error('ACCOUNT_INACTIVE');

  const ok = await bcrypt.compare(password, account.password_hash);
  if (!ok) throw new Error('INVALID_CREDENTIALS');

  const roles = (account.roles || []).map(r => r.code);

  // sinh jti mới cho cặp token
  const jtiAccess  = genJti();
  const jtiRefresh = genJti();

  const accessToken  = signAccessToken({ sub: account.id, roles, jti: jtiAccess });
  const refreshToken = signRefreshToken({ sub: account.id, jti: jtiRefresh });

  await createSession(account.id, refreshToken, { userAgent, ip }, { jtiAccess, jtiRefresh });

  return {
    accessToken,
    refreshToken,
    account: { id: account.id, username: account.username, roles }
  };
}

async function refresh({ refreshToken, userAgent, ip }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new Error('INVALID_REFRESH');
  }

  const account = await loadAccountWithRolesById(payload.sub);
  if (!account || !account.is_active) throw new Error('ACCOUNT_INACTIVE');

  const oldSession = await findValidSessionByRefresh(account.id, refreshToken);
  if (!oldSession) throw new Error('REFRESH_NOT_FOUND_OR_REVOKED');

  // (khuyến nghị) kiểm tra jti_refresh khớp với payload
  if (oldSession.jti_refresh && payload.jti && oldSession.jti_refresh !== payload.jti) {
    throw new Error('REFRESH_NOT_FOUND_OR_REVOKED');
  }

  // tạo cặp mới + session mới
  const roles = (account.roles || []).map(r => r.code);
  const jtiAccessNew  = genJti();
  const jtiRefreshNew = genJti();

  const accessToken   = signAccessToken({ sub: account.id, roles, jti: jtiAccessNew });
  const newRefresh    = signRefreshToken({ sub: account.id, jti: jtiRefreshNew });

  const newSession = await createSession(
    account.id,
    newRefresh,
    { userAgent, ip },
    { jtiAccess: jtiAccessNew, jtiRefresh: jtiRefreshNew }
  );

  // revoke phiên cũ ngay lập tức (→ access cũ bị vô hiệu qua middleware)
  await revokeSession(oldSession, newSession.id);

  return {
    accessToken,
    refreshToken: newRefresh,
    account: { id: account.id, username: account.username, roles }
  };
}

async function logout({ refreshToken }) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return { success: true }; // idempotent
  }
  const session = await findValidSessionByRefresh(payload.sub, refreshToken);
  if (session) await revokeSession(session);
  return { success: true };
}

module.exports = { login, refresh, logout };
