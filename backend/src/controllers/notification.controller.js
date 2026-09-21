import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as notifService from '../services/notification.service.js';

export const list = asyncHandler(async (req, res) => {
  const result = await notifService.listNotifications(req.user.id, {
    page: Math.max(parseInt(req.query.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100),
  });
  success(res, 200, 'Notifications fetched', result);
});

export const markOneRead = asyncHandler(async (req, res) => {
  const ok = await notifService.markRead(req.user.id, req.params.id);
  success(res, 200, ok ? 'Marked as read' : 'Notification not found');
});

export const markAll = asyncHandler(async (req, res) => {
  await notifService.markAllRead(req.user.id);
  success(res, 200, 'All notifications marked as read');
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await notifService.countUnread(req.user.id);
  success(res, 200, 'Unread count', { count });
});