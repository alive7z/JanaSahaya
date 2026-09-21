import { query, transaction } from '../config/database.js';
import { updateFollowerCount } from './issue.repository.js';

export async function hasFollowed(issueId, userId) {
  const rows = await query(
    'SELECT 1 FROM issue_followers WHERE issue_id = ? AND user_id = ?',
    [issueId, userId],
  );
  return rows.length > 0;
}

export async function followIssue(issueId, userId) {
  return transaction(async (conn) => {
    const [result] = await conn.execute(
      'INSERT IGNORE INTO issue_followers (issue_id, user_id) VALUES (?, ?)',
      [issueId, userId],
    );
    if (result.affectedRows > 0) await updateFollowerCount(conn, issueId, 1);
    return { added: result.affectedRows > 0 };
  });
}

export async function unfollowIssue(issueId, userId) {
  return transaction(async (conn) => {
    const [result] = await conn.execute(
      'DELETE FROM issue_followers WHERE issue_id = ? AND user_id = ?',
      [issueId, userId],
    );
    if (result.affectedRows > 0) await updateFollowerCount(conn, issueId, -1);
    return { removed: result.affectedRows > 0 };
  });
}

export async function followerUserIds(issueId, excludeUserId = null) {
  const params = [issueId];
  let sql = 'SELECT user_id FROM issue_followers WHERE issue_id = ?';
  if (excludeUserId) {
    sql += ' AND user_id <> ?';
    params.push(excludeUserId);
  }
  const rows = await query(sql, params);
  return rows.map((r) => r.user_id);
}

export async function followerIdsOfReporter(issueId, reporterId) {
  return followerUserIds(issueId, reporterId);
}