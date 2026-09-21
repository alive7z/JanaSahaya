import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import env from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), name: user.full_name, jti: crypto.randomUUID() },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpires },
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user.id), kind: 'refresh' },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpires },
  );
}

export function verifyAccessToken(token) {
  try {
    return { payload: jwt.verify(token, env.jwt.accessSecret) };
  } catch (err) {
    return { error: err };
  }
}

export function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, env.jwt.refreshSecret);
    if (payload.kind !== 'refresh') return { error: new Error('invalid token kind') };
    return { payload };
  } catch (err) {
    return { error: err };
  }
}

export function refreshExpiryDate() {
  const mapping = { '7d': 7, '14d': 14, '30d': 30 };
  const days = mapping[env.jwt.refreshExpires] || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}