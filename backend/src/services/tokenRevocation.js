import { verifyAccessToken } from '../utils/jwt.js';

/**
 * In-memory denylist of revoked access tokens (keyed by jti).
 *
 * Access tokens are short-lived JWTs; a logout must invalidate the current
 * access token immediately so the browser Back button cannot restore a
 * protected session. Entries are removed once their token would have expired
 * anyway.
 */
const revoked = new Map();

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  for (const [jti, exp] of revoked) {
    if (exp * 1000 < now) revoked.delete(jti);
  }
}

const timer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
if (timer.unref) timer.unref();

/** Revoke an access token (raw JWT string) if it is currently valid. */
export function revokeAccessToken(token) {
  if (!token) return;
  const { payload } = verifyAccessToken(token);
  if (payload?.jti && payload?.exp) {
    revoked.set(payload.jti, payload.exp);
  }
}

export function accessTokenRevoked(jti) {
  return jti != null && revoked.has(jti);
}

export function revokedTokenCount() {
  return revoked.size;
}