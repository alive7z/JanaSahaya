import { query } from '../config/database.js';

export async function createNotification({ userId, type, title, body = null, link = null, payload = null }) {
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, body, link, payload)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, body, link, payload ? JSON.stringify(payload) : null],
  );
  return result.insertId;
}

export async function listNotifications(userId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [rows, total, unread] = await Promise.all([
    query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset],
    ),
    query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?', [userId]),
    query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]),
  ]);
  return {
    notifications: rows,
    total: total[0].n,
    unread: unread[0].n,
    page,
    pages: Math.ceil(total[0].n / limit),
  };
}

export async function markRead(userId, notificationId) {
  const result = await query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
  );
  return result.affectedRows > 0;
}

export async function markAllRead(userId) {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
}

export async function countUnread(userId) {
  const rows = await query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return rows[0].n;
}