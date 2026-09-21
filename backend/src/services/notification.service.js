import { createNotification, listNotifications, markRead, markAllRead, countUnread } from '../repositories/notification.repository.js';
import { emitToUser, emitToUsers, emitToIssue } from '../sockets/emitter.js';
import { query } from '../config/database.js';

export async function notify(userId, notification, { socket = true } = {}) {
  const id = await createNotification({ userId, ...notification });
  if (socket) {
    emitToUser(userId, 'notification:new', { id, ...notification });
  }
  return id;
}

export async function notifyMany(userIds, notification) {
  for (const userId of userIds) {
    await notify(userId, notification);
  }
}

/** Notify all followers of an issue (excluding the actor). */
export async function notifyIssueFollowers(issueId, notification, { excludeUserId = null } = {}) {
  const rows = await query(
    `SELECT user_id FROM issue_followers WHERE issue_id = ? ${excludeUserId ? 'AND user_id <> ?' : ''}`,
    excludeUserId ? [issueId, excludeUserId] : [issueId],
  );
  await notifyMany(rows.map((r) => r.user_id), notification);
  return rows.length;
}

export async function notifyDepartmentOfficers(departmentId, notification) {
  const rows = await query(
    `SELECT u.id FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'OFFICER' AND ur.department_id = ?`,
    [departmentId],
  );
  await notifyMany(rows.map((r) => r.id), notification);
  return rows.length;
}

export async function notifyAdmins(notification) {
  const rows = await query(
    `SELECT u.id FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'ADMIN'`,
  );
  await notifyMany(rows.map((r) => r.id), notification);
  return rows.length;
}

export { listNotifications, markRead, markAllRead, countUnread };

export function emitIssueUpdate(issueId, event, data) {
  emitToIssue(issueId, event, data);
}

export function emitUserUpdate(userId, event, data) {
  emitToUser(userId, event, data);
}

export function emitUsersUpdate(userIds, event, data) {
  emitToUsers(userIds, event, data);
}