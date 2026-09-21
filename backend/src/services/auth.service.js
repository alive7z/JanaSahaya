import crypto from 'node:crypto';
import AppError from '../utils/AppError.js';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, refreshExpiryDate } from '../utils/jwt.js';
import { query, transaction } from '../config/database.js';
import { toPublicUser } from '../utils/sanitize.js';
import {
  getUser,
  getUserByEmail,
  getUserRoles,
  createUser,
  assignRole,
  recordLastLogin,
} from '../repositories/user.repository.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function persistRefreshToken({ userId, token, ip, userAgent, familyId = null, previousTokenId = null }) {
  const family = familyId || crypto.randomUUID();
  const result = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, hashToken(token), family, refreshExpiryDate(), ip ?? null, userAgent?.slice(0, 250) ?? null],
  );
  if (previousTokenId) {
    await query(
      'UPDATE refresh_tokens SET replaced_by_id = ? WHERE id = ?',
      [result.insertId, previousTokenId],
    );
  }
  return { id: result.insertId, familyId: family };
}

export async function issueTokens(user, { ip, userAgent }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const meta = await persistRefreshToken({ userId: user.id, token: refreshToken, ip, userAgent });
  return { accessToken, refreshToken, familyId: meta.familyId };
}

export async function register({ fullName, email, phone, password, city, ward, ip, userAgent }) {
  if (await getUserByEmail(email)) {
    throw new AppError(409, 'An account with this email already exists');
  }

  let createdId;
  const passwordHash = await hashPassword(password);
  await transaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO users (full_name, email, phone, password_hash, city, ward)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName, email.toLowerCase(), phone || null, passwordHash, city || null, ward || null],
    );
    createdId = result.insertId;
    const [role] = await conn.execute("SELECT id FROM roles WHERE name = 'CITIZEN'");
    await conn.execute(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [createdId, role[0].id],
    );
  });

  const user = await getUser(createdId);
  const roles = await getUserRoles(createdId);
  const { accessToken, refreshToken } = await issueTokens(user, { ip, userAgent });
  return { user: toPublicUser(user), roles, accessToken, refreshToken };
}

export async function login({ email, password, ip, userAgent }) {
  const user = await getUserByEmail(email.toLowerCase());
  if (!user) throw new AppError(401, 'Invalid email or password');

  const match = await comparePassword(password, user.password_hash);
  if (!match) throw new AppError(401, 'Invalid email or password');
  if (user.is_banned) throw new AppError(403, 'This account has been suspended');

  await recordLastLogin(user.id);
  const roles = await getUserRoles(user.id);
  const { accessToken, refreshToken } = await issueTokens(user, { ip, userAgent });
  return { user: toPublicUser(user), roles, accessToken, refreshToken };
}

export async function refresh({ refreshToken, ip, userAgent }) {
  if (!refreshToken) throw new AppError(401, 'Refresh token missing');

  const { payload, error } = verifyRefreshToken(refreshToken);
  if (error) throw new AppError(401, 'Invalid refresh token');

  const stored = await query(
    `SELECT id, user_id, family_id, replaced_by_id, revoked_at, expires_at FROM refresh_tokens
     WHERE token_hash = ?`,
    [hashToken(refreshToken)],
  );
  const row = stored[0];

  // Token present but already rotated with a successor → reuse attempt.
  if (!row || row.revoked_at || row.replaced_by_id) {
    if (row?.family_id) {
      // Reused/old token in a family: revoke the whole family (theft containment).
      await query(
        'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = ?',
        [row.family_id],
      );
    }
    // Invalidating on reuse also revokes upcoming tokens so a stolen old token
    // cannot refresh repeatedly, and any truly new session using this family is locked.
    throw new AppError(401, row
      ? 'Refresh token has been revoked (possible reuse detected)'
      : 'Refresh token has been revoked');
  }
  if (new Date(row.expires_at) < new Date()) throw new AppError(401, 'Refresh token has expired');
  if (String(row.user_id) !== payload.sub) throw new AppError(401, 'Refresh token mismatch');

  const user = await getUser(row.user_id);
  if (!user) throw new AppError(401, 'User no longer exists');
  if (user.is_banned) throw new AppError(403, 'This account has been suspended');

  // Rotate: revoke the presented token, issue a fresh pair in the same family.
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [row.id]);
  const roles = await getUserRoles(row.user_id);
  const { accessToken, refreshToken: newRefresh } = await issueTokensWithFamily(user, {
    ip, userAgent, familyId: row.family_id, previousTokenId: row.id,
  });

  return { user: toPublicUser(user), roles, accessToken, refreshToken: newRefresh };
}

async function issueTokensWithFamily(user, { ip, userAgent, familyId, previousTokenId }) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await persistRefreshToken({
    userId: user.id,
    token: refreshToken,
    ip,
    userAgent,
    familyId,
    previousTokenId,
  });
  return { accessToken, refreshToken };
}

export async function logout({ refreshToken, accessToken }) {
  // Immediately invalidate the presented access token so protected endpoints
  // fail even before the short-lived JWT expires.
  const { revokeAccessToken } = await import('./tokenRevocation.js');
  if (accessToken) revokeAccessToken(accessToken);

  if (!refreshToken) return;
  const rows = await query(
    'SELECT family_id FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL',
    [hashToken(refreshToken)],
  );
  if (rows[0]?.family_id) {
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL',
      [rows[0].family_id],
    );
    return;
  }
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
    [hashToken(refreshToken)],
  );
}

/** Revoke every refresh session for the user except the one making the request. */
export async function logoutOtherSessions({ userId, currentRefreshToken }) {
  const result = await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = ? AND revoked_at IS NULL AND token_hash <> ?`,
    [userId, currentRefreshToken ? hashToken(currentRefreshToken) : ''],
  );
  return result.affectedRows;
}

export async function changePassword(userId, { oldPassword, newPassword }) {
  const rows = await query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  const user = rows[0];
  if (!user) throw new AppError(404, 'User not found');

  const match = await comparePassword(oldPassword, user.password_hash);
  if (!match) throw new AppError(400, 'Current password is incorrect');

  const { hashPassword } = await import('../utils/password.js');
  const validation = validatePasswordStrength(newPassword);
  if (validation) throw new AppError(422, validation);

  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(newPassword), userId]);
  await query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
    [userId],
  );
}
