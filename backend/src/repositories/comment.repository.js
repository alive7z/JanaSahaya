import { query, getOne, transaction } from '../config/database.js';

const COMMENT_SELECT = `
  SELECT c.id, c.issue_id, c.user_id, c.parent_id, c.content, c.is_hidden,
         c.is_edited, c.created_at, c.updated_at,
         u.full_name AS author_name, u.profile_picture AS author_picture
  FROM issue_comments c
  JOIN users u ON u.id = c.user_id
`;

export async function addComment(issueId, userId, content, parentId = null) {
  return transaction(async (conn) => {
    const [result] = await conn.execute(
      'INSERT INTO issue_comments (issue_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [issueId, userId, content, parentId ?? null],
    );
    await conn.execute(
      'UPDATE issues SET comment_count = comment_count + 1, last_activity_at = NOW() WHERE id = ?',
      [issueId],
    );
    const [rows] = await conn.execute(`${COMMENT_SELECT} WHERE c.id = ?`, [result.insertId]);
    return rows[0];
  });
}

export async function listComments(issueId) {
  return query(`${COMMENT_SELECT} WHERE c.issue_id = ? AND c.is_hidden = 0 ORDER BY c.created_at ASC`, [issueId]);
}

export async function getComment(id) {
  return getOne(`${COMMENT_SELECT} WHERE c.id = ?`, [id]);
}

export async function isOwner(commentId, userId) {
  const row = await getOne('SELECT 1 FROM issue_comments WHERE id = ? AND user_id = ?', [commentId, userId]);
  return !!row;
}

export async function updateComment(commentId, content) {
  await query('UPDATE issue_comments SET content = ?, is_edited = 1 WHERE id = ?', [content, commentId]);
}

export async function deleteComment(commentId) {
  return transaction(async (conn) => {
    const [comment] = await conn.execute('SELECT issue_id FROM issue_comments WHERE id = ?', [commentId]);
    await conn.execute('DELETE FROM issue_comments WHERE id = ?', [commentId]);
    if (comment.length) {
      await conn.execute(
        'UPDATE issues SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?',
        [comment[0].issue_id],
      );
    }
  });
}

export async function hideComment(commentId) {
  await query('UPDATE issue_comments SET is_hidden = 1 WHERE id = ?', [commentId]);
}

export async function reportContent({ reporterId, contentType, contentId, reason }) {
  const result = await query(
    `INSERT INTO reports (reporter_id, content_type, content_id, reason)
     VALUES (?, ?, ?, ?)`,
    [reporterId, contentType, contentId, reason],
  );
  return result.insertId;
}

export async function listOpenReports() {
  return query(
    `SELECT r.*, u.full_name AS reporter_name FROM reports r
     LEFT JOIN users u ON u.id = r.reporter_id
     WHERE r.status = 'OPEN'
     ORDER BY r.created_at DESC`,
  );
}

export async function resolveReport(reportId, handlerId, status) {
  await query(
    'UPDATE reports SET status = ?, handled_by = ?, handled_at = NOW() WHERE id = ?',
    [status, handlerId, reportId],
  );
}