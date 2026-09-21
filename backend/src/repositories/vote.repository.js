import { transaction, query, getOne } from '../config/database.js';
import { updateVoteCount } from './issue.repository.js';

export async function hasVoted(issueId, userId) {
  const row = await getOne(
    'SELECT 1 FROM issue_votes WHERE issue_id = ? AND user_id = ?',
    [issueId, userId],
  );
  return !!row;
}

export async function addVote(issueId, userId) {
  return transaction(async (conn) => {
    const [result] = await conn.execute(
      'INSERT IGNORE INTO issue_votes (issue_id, user_id) VALUES (?, ?)',
      [issueId, userId],
    );
    const inserted = result.affectedRows > 0;
    if (inserted) {
      await updateVoteCount(conn, issueId, 1);
      await conn.execute('UPDATE issues SET last_activity_at = NOW() WHERE id = ?', [issueId]);
    }
    const [rows] = await conn.execute(
      'SELECT issue_id, user_id, created_at FROM issue_votes WHERE issue_id = ? AND user_id = ?',
      [issueId, userId],
    );
    return { inserted, vote: rows[0] ?? null };
  });
}

export async function removeVote(issueId, userId) {
  return transaction(async (conn) => {
    const [result] = await conn.execute(
      'DELETE FROM issue_votes WHERE issue_id = ? AND user_id = ?',
      [issueId, userId],
    );
    if (result.affectedRows > 0) {
      await updateVoteCount(conn, issueId, -1);
      await conn.execute('UPDATE issues SET last_activity_at = NOW() WHERE id = ?', [issueId]);
    }
    return { removed: result.affectedRows > 0 };
  });
}

export async function countVotes(issueId) {
  return query('SELECT COUNT(*) AS n FROM issue_votes WHERE issue_id = ?', [issueId]);
}