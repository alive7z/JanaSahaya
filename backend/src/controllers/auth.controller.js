import { asyncHandler } from '../utils/asyncHandler.js';
import { success, failure } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import * as authService from '../services/auth.service.js';
import { countUnread } from '../repositories/notification.repository.js';
import env from '../config/env.js';

const refreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: env.cookie.sameSite,
  secure: env.cookie.secure,
  path: '/api/v1/auth',
  ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
});

function setRefreshCookie(res, token) {
  res.cookie(env.cookie.name, token, {
    ...refreshCookieOptions(),
    maxAge: env.cookie.maxAgeDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.cookie.name, refreshCookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user, roles } = await authService.register({
    ...req.body,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setRefreshCookie(res, refreshToken);
  success(res, 201, 'Account created successfully', {
    user,
    roles,
    accessToken,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user, roles } = await authService.login({
    ...req.body,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setRefreshCookie(res, refreshToken);
  success(res, 200, 'Login successful', { user, roles, accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookie.name] || req.body?.refreshToken;
  if (!token) throw new AppError(401, 'Refresh token missing');

  const { accessToken, refreshToken, user, roles } = await authService.refresh({
    refreshToken: token,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  setRefreshCookie(res, refreshToken);
  success(res, 200, 'Tokens refreshed', { user, roles, accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookie.name] || req.body?.refreshToken;
  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  await authService.logout({ refreshToken: token, accessToken });
  clearRefreshCookie(res);
  success(res, 200, 'Logged out');
});

export const logoutOtherSessions = asyncHandler(async (req, res) => {
  const token = req.cookies?.[env.cookie.name] || req.body?.refreshToken;
  const revoked = await authService.logoutOtherSessions({
    userId: req.user.id,
    currentRefreshToken: token,
  });
  success(res, 200, 'Other sessions logged out', { revoked });
});

export const me = asyncHandler(async (req, res) => {
  const unread = await countUnread(req.user.id);
  success(res, 200, 'Current user', {
    user: {
      id: req.user.id,
      full_name: req.user.full_name,
      email: req.user.email,
      phone: req.user.phone,
      city: req.user.city,
    },
    roles: req.user.roles,
    unreadNotifications: unread,
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  success(res, 200, 'Password changed. Please log in again.');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { updateProfile } = await import('../services/user.service.js');
  await updateProfile(req.user.id, req.body);
  success(res, 200, 'Profile updated');
});

export const unsupported = (_req, res) => failure(res, 501, 'Not implemented');
