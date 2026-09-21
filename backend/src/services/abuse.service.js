import { query } from '../config/database.js';

const DUPLICATE_ABUSE_WINDOW_DAYS = 30;
const SPAM_BURST_HOURS = 24;
const SPAM_BURST_MIN = 5;
const FRESH_ACCOUNT_HOURS = 24;
const COMMENT_BURST_HOURS = 1;
const COMMENT_BURST_MIN = 8;

/**
 * Deterministic abuse signal detection (requirement: spam detection that is
 * explainable, not a model). Everything below is a plain SQL query so the
 * dashboard can show WHO is flagged and WHY.
 */
export async function abuseSignals() {
  const [duplicateSpam, freshBurst, emptyProfile, imageBurst, commentBurst, reportTargets, banned] =
    await Promise.all([
      // Accounts routinely submitting issues that end up marked duplicate/rejected/archived.
      query(
        `SELECT i.reporter_id AS user_id, COUNT(*) AS n
         FROM issues i
         WHERE i.status IN ('DUPLICATE','REJECTED')
           AND i.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY i.reporter_id HAVING n >= 3`,
        [DUPLICATE_ABUSE_WINDOW_DAYS],
      ),
      // Fresh accounts posting several issues in a short window.
      query(
        `SELECT u.id AS user_id, COUNT(i.id) AS n
         FROM users u
         JOIN issues i ON i.reporter_id = u.id
         WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
           AND i.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
         GROUP BY u.id HAVING n >= ?`,
        [FRESH_ACCOUNT_HOURS, SPAM_BURST_HOURS, SPAM_BURST_MIN],
      ),
      // Low-trust accounts with no bio and very low points.
      query(
        `SELECT id AS user_id, points
         FROM users
         WHERE (bio IS NULL OR bio = '')
           AND points < 20
           AND is_banned = 0`,
      ),
      // Repeated uploads of byte-identical images (same size + mime) by one user.
      query(
        `SELECT ii.uploaded_by AS user_id, ii.mime_type, ii.size, COUNT(*) AS n
         FROM issue_images ii
         WHERE ii.uploaded_by IS NOT NULL
         GROUP BY ii.uploaded_by, ii.mime_type, ii.size
         HAVING n >= 4`,
      ),
      // Comment spam bursts.
      query(
        `SELECT c.user_id, COUNT(*) AS n
         FROM issue_comments c
         WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
         GROUP BY c.user_id HAVING n >= ?`,
        [COMMENT_BURST_HOURS, COMMENT_BURST_MIN],
      ),
      // Users whose content is frequently reported by others.
      query(
        `SELECT c.user_id, COUNT(*) AS n
         FROM reports r
         JOIN issue_comments c ON c.id = r.content_id AND r.content_type = 'comment'
         WHERE r.status = 'OPEN'
         GROUP BY c.user_id HAVING n >= 3`,
      ),
      query('SELECT id AS user_id FROM users WHERE is_banned = 1'),
    ]);

  const signalsMap = new Map();
  const add = (userId, key, detail) => {
    if (!userId) return;
    const id = String(userId);
    if (!signalsMap.has(id)) signalsMap.set(id, { user_id: Number(id), signals: [] });
    signalsMap.get(id).signals.push({ key, detail });
  };

  for (const r of duplicateSpam) add(r.user_id, 'repeat_duplicates', `${r.n} issues marked duplicate/rejected`);
  for (const r of freshBurst) add(r.user_id, 'fresh_account_burst', `${r.n} issues reported as a new account`);
  for (const r of emptyProfile) add(r.user_id, 'empty_profile_low_reputation', `${r.points} points, no bio`);
  for (const r of imageBurst) add(r.user_id, 'identical_image_uploads', `${r.n} identical ${r.mime_type} uploads`);
  for (const r of commentBurst) add(r.user_id, 'comment_burst', `${r.n} comments in ${COMMENT_BURST_HOURS}h`);
  for (const r of reportTargets) add(r.user_id, 'frequently_reported', `${r.n} open reports against content`);
  for (const r of banned) add(r.user_id, 'banned', 'account suspended');

  if (signalsMap.size === 0) return [];

  const users = await query(
    `SELECT u.id, u.full_name, u.email, u.points, u.is_banned, u.created_at,
            (SELECT COUNT(*) FROM issues i WHERE i.reporter_id = u.id) AS issues_reported
     FROM users u
     WHERE u.id IN (${[...signalsMap.keys()].join(',')})`,
  );

  return users.map((u) => ({ ...u, signals: signalsMap.get(String(u.id))?.signals ?? [] }));
}

/** Explainable trust snapshot for a single reporter (shown on their profile). */
export async function reporterTrust(userId) {
  const [user, issueStats, openReports] = await Promise.all([
    query(
      `SELECT u.id, u.full_name, u.is_banned, u.points, u.bio,
              TIMESTAMPDIFF(HOUR, u.created_at, NOW()) AS account_age_hours
       FROM users u WHERE u.id = ?`,
      [userId],
    ),
    query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'RESOLVED') AS resolved,
         SUM(status = 'CLOSED') AS closed,
         SUM(status = 'DUPLICATE') AS duplicates,
         SUM(status = 'REJECTED') AS rejected,
         SUM(verification_status = 'VERIFIED') AS verified
       FROM issues WHERE reporter_id = ? AND deleted_at IS NULL`,
      [userId],
    ),
    query(
      `SELECT COUNT(*) AS n FROM reports r
       LEFT JOIN issue_comments c ON c.id = r.content_id AND r.content_type = 'comment'
       WHERE r.status = 'OPEN' AND c.user_id = ?`,
      [userId],
    ),
  ]);

  const u = user[0];
  if (!u) return { id: userId, found: false };
  const s = issueStats[0] || {};
  const resolved = Number(s.resolved || 0);
  const total = Number(s.total || 0);
  const flagged =
    u.is_banned === 1 ||
    Number(s.duplicates || 0) >= 3 ||
    Number(s.rejected || 0) >= 3 ||
    Number(openReports[0]?.n || 0) >= 3;

  const signals = [];
  if (Number(s.rejected || 0) >= 3) signals.push('multiple rejected issues');
  if (Number(s.duplicates || 0) >= 3) signals.push('multiple duplicate issues');
  if (!u.bio && u.points < 20) signals.push('low reputation, no bio');
  if (Number(openReports[0]?.n || 0) >= 3) signals.push('content frequently reported');
  if (u.is_banned) signals.push('account suspended');

  let level = 'trusted';
  if (flagged || signals.length) level = 'flagged';
  else if (resolved >= 2 && total >= 3) level = 'verified_reporter';

  return {
    id: userId,
    found: true,
    level,
    signals,
    stats: {
      issuesTotal: total,
      resolved,
      verified: Number(s.verified || 0),
      duplicates: Number(s.duplicates || 0),
      rejected: Number(s.rejected || 0),
      openReportsAgainst: Number(openReports[0]?.n || 0),
      points: u.points,
    },
  };
}

/** Flag summary for a single issue (shown in the admin review card). */
export async function issueAbuseFlags(issueId) {
  const [dup, images, comments, reports] = await Promise.all([
    query('SELECT COUNT(*) AS n FROM issues WHERE duplicate_of_id = ? AND status = ?', [issueId, 'DUPLICATE']),
    query('SELECT COUNT(*) AS n FROM issue_images WHERE issue_id = ?', [issueId]),
    query('SELECT COUNT(*) AS n FROM issue_comments WHERE issue_id = ? AND is_hidden = 0', [issueId]),
    query('SELECT COUNT(*) AS n FROM reports WHERE content_type = ? AND content_id = ? AND status = ?', ['issue', String(issueId), 'OPEN']),
  ]);
  const flags = [];
  if (reports[0].n > 0) flags.push(`${reports[0].n} open report(s)`);
  if (dup[0].n > 0) flags.push('has duplicate copies');
  return flags;
}