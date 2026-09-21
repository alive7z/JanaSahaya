import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import { failure } from '../utils/apiResponse.js';

function makeLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => failure(res, 429, message),
  });
}

/** Global API fallback limiter. */
export function apiLimiter() {
  return makeLimiter({
    windowMs: env.rateLimit.windowMinutes * 60 * 1000,
    max: env.rateLimit.max,
    message: 'Too many requests, please slow down',
  });
}

/** Login / refresh credential attempts. */
export function authLimiter() {
  return makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimit.authMax,
    message: 'Too many authentication attempts, try again later',
  });
}

/** Public registration attempts (abuse prone). */
export function registerLimiter() {
  return makeLimiter({
    windowMs: 60 * 60 * 1000,
    max: env.rateLimit.registerMax,
    message: 'Too many accounts created from this address, try again later',
  });
}

/** Password change attempts. */
export function passwordLimiter() {
  return makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimit.passwordMax,
    message: 'Too many password attempts, please slow down',
  });
}

/** Issue reporting, weighted per reporter. */
export function reportLimiter() {
  return makeLimiter({
    windowMs: 60 * 60 * 1000,
    max: env.rateLimit.reportMax,
    message: 'You have reported too many issues, please slow down',
  });
}

/** Comment creation. */
export function commentLimiter() {
  return makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimit.commentMax,
    message: 'Too many comments, please slow down',
  });
}

/** Voting / following bursts. */
export function interactionLimiter() {
  return makeLimiter({
    windowMs: 15 * 60 * 1000,
    max: env.rateLimit.interactionMax,
    message: 'Too many interactions, please slow down',
  });
}

export default { apiLimiter, authLimiter, registerLimiter, passwordLimiter, reportLimiter, commentLimiter, interactionLimiter };