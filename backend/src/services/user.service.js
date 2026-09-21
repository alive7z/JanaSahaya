import { query } from '../config/database.js';
import { updateProfile as repoUpdate } from '../repositories/user.repository.js';
import AppError from '../utils/AppError.js';

export async function updateProfile(userId, fields) {
  const allowedKeys = ['fullName', 'phone', 'city', 'ward', 'bio', 'profilePicture'];
  if (!allowedKeys.some((k) => fields[k] !== undefined)) {
    throw new AppError(422, 'Nothing to update');
  }
  await repoUpdate(userId, fields);
}

export async function getUserDashboard(userId) {
  const [reported, resolved, supported, following, points, recent, unread] = await Promise.all([
    query('SELECT COUNT(*) AS n FROM issues WHERE reporter_id = ?', [userId]),
    query('SELECT COUNT(*) AS n FROM issues WHERE reporter_id = ? AND status = ?', [userId, 'RESOLVED']),
    query('SELECT COUNT(*) AS n FROM issue_votes WHERE user_id = ?', [userId]),
    query('SELECT COUNT(*) AS n FROM issue_followers WHERE user_id = ?', [userId]),
    query('SELECT points FROM users WHERE id = ?', [userId]),
    query(
      `SELECT ih.issue_id, ih.from_status, ih.to_status, ih.created_at, i.title
       FROM issue_status_history ih
       JOIN issues i ON i.id = ih.issue_id
       WHERE ih.changed_by = ? OR i.reporter_id = ?
       ORDER BY ih.created_at DESC
       LIMIT 15`,
      [userId, userId],
    ),
    query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]),
  ]);

  return {
    stats: {
      issuesReported: reported[0].n,
      issuesResolved: resolved[0].n,
      issuesSupported: supported[0].n,
      issuesFollowing: following[0].n,
      contributionPoints: points[0]?.points ?? 0,
    },
    recentActivity: recent,
    unreadNotifications: unread[0].n,
  };
}

export async function officerDashboard(userId) {
  const [roleRow] = await query(
    `SELECT ur.department_id FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = 'OFFICER'`,
    [userId],
  );
  const departmentId = roleRow?.department_id;
  if (!departmentId) throw new AppError(403, 'Not an officer');

  const where = 'department_id = ? AND status IN (?,?,?,?,?)';
  const params = [departmentId, 'SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED'];

  const [assigned, critical, resolvedMonth, slaViolated, byPriority, byStatus, avgResolution, dept, assignedToMe, resolvedByMe, issues, slaWarnings] =
    await Promise.all([
      query(`SELECT COUNT(*) AS n FROM issues WHERE ${where}`, params),
      query(`SELECT COUNT(*) AS n FROM issues WHERE ${where} AND priority = ?`, [...params, 'CRITICAL']),
      query(
        `SELECT COUNT(*) AS n FROM issues WHERE department_id = ? AND status = ?
         AND resolved_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
        [departmentId, 'RESOLVED'],
      ),
      query(
        `SELECT COUNT(*) AS n FROM issues WHERE ${where} AND resolution_deadline IS NOT NULL AND resolution_deadline < NOW()`,
        params,
      ),
      query(
        `SELECT priority, COUNT(*) AS n FROM issues WHERE ${where} GROUP BY priority`,
        params,
      ),
      query(
        `SELECT status, COUNT(*) AS n FROM issues WHERE department_id = ? GROUP BY status`,
        [departmentId],
      ),
      query(
        `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) AS avg_hours
         FROM issues WHERE department_id = ? AND status = 'RESOLVED' AND resolved_at IS NOT NULL`,
        [departmentId],
      ),
      query('SELECT id, name FROM departments WHERE id = ?', [departmentId]),
      query(
        `SELECT COUNT(*) AS n FROM issues WHERE assigned_officer_id = ? AND status IN ('ASSIGNED','IN_PROGRESS','REOPENED')`,
        [userId],
      ),
      query(
        `SELECT COUNT(*) AS n FROM issues WHERE assigned_officer_id = ? AND status = 'RESOLVED'`,
        [userId],
      ),
      query(
        `SELECT i.*, c.name AS category_name, d.name AS department_name, u.full_name AS reporter_name
         FROM issues i
         LEFT JOIN issue_categories c ON c.id = i.category_id
         LEFT JOIN departments d ON d.id = i.department_id
         LEFT JOIN users u ON u.id = i.reporter_id
         WHERE i.department_id = ? AND i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
         ORDER BY i.priority_score DESC, i.created_at ASC`,
        [departmentId],
      ),
      query(
        `SELECT COUNT(*) AS n FROM issues WHERE department_id = ? AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
         AND resolution_deadline IS NOT NULL AND resolution_deadline <= DATE_ADD(NOW(), INTERVAL 24 HOUR)`,
        [departmentId],
      ),
    ]);

  // Attach latest priority explanation to each queued issue.
  const explanations = await Promise.all(
    issues.map(async (i) => {
      const [ph] = await query(
        'SELECT priority_score, priority, reasons_json FROM priority_history WHERE issue_id = ? ORDER BY created_at DESC LIMIT 1',
        [i.id],
      );
      return ph
        ? {
            score: ph.priority_score,
            priority: ph.priority,
            reasons: Array.isArray(ph.reasons_json)
              ? ph.reasons_json
              : JSON.parse(ph.reasons_json || '[]'),
          }
        : { score: i.priority_score, priority: i.priority, reasons: [] };
    }),
  );
  const withExplanation = issues.map((i, idx) => ({ ...i, explanation: explanations[idx] }));

  return {
    department: dept[0] ?? { id: departmentId, name: null },
    stats: {
      open_in_department: assigned[0].n,
      critical: critical[0].n,
      resolved_this_month: resolvedMonth[0].n,
      sla_violations: slaViolated[0].n,
      avg_resolution_hours: Math.round(avgResolution[0]?.avg_hours ?? 0),
      assigned_to_me: assignedToMe[0].n,
      resolved_by_me: resolvedByMe[0].n,
      sla_warnings: slaWarnings[0].n,
    },
    sla_warnings_count: slaWarnings[0].n,
    sla_rules: {},
    issues: withExplanation,
    byPriority,
    byStatus,
  };
}

export async function adminDashboard() {
  const [
    users, issues, open, resolved, critical, departments, resolutionRate, avgResolution, slaCompliance,
    archived, needsAttention, verificationBreakdown, recentReports, deptPerformance, recentActivity,
  ] =
    await Promise.all([
      query('SELECT COUNT(*) AS n FROM users'),
      query('SELECT COUNT(*) AS n FROM issues WHERE deleted_at IS NULL'),
      query(`SELECT COUNT(*) AS n FROM issues WHERE deleted_at IS NULL AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')`),
      query(`SELECT COUNT(*) AS n FROM issues WHERE deleted_at IS NULL AND status = 'RESOLVED'`),
      query(`SELECT COUNT(*) AS n FROM issues WHERE deleted_at IS NULL AND priority = 'CRITICAL' AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')`),
      query('SELECT COUNT(*) AS n FROM departments'),
      query(
        `SELECT
           ROUND(SUM(status = 'RESOLVED') * 100.0 / COUNT(*), 1) AS rate
         FROM issues WHERE deleted_at IS NULL`,
      ),
      query(
        `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) AS avg_hours
         FROM issues WHERE deleted_at IS NULL AND status = 'RESOLVED' AND resolved_at IS NOT NULL`,
      ),
      query(
        `SELECT
           ROUND(
             SUM(CASE WHEN resolution_deadline IS NULL OR resolution_deadline >= NOW() THEN 1 ELSE 0 END) * 100.0
             / COUNT(*), 1
           ) AS rate
         FROM issues
         WHERE deleted_at IS NULL
           AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
           AND resolution_deadline IS NOT NULL`,
      ),
      query('SELECT COUNT(*) AS n FROM issues WHERE deleted_at IS NOT NULL'),
      query(
        `SELECT
           SUM(verification_status = 'PENDING' AND status IN ('SUBMITTED','UNDER_REVIEW')) AS pending_review,
           SUM(deleted_at IS NULL AND resolution_deadline IS NOT NULL AND resolution_deadline < NOW()
               AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS late,
           SUM(deleted_at IS NULL AND acknowledged_at IS NULL
               AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS unacknowledged,
           SUM(deleted_at IS NULL AND status = 'SUBMITTED') AS fresh_submissions
         FROM issues`,
      ),
      query(
        `SELECT verification_status, COUNT(*) AS n
         FROM issues WHERE deleted_at IS NULL GROUP BY verification_status`,
      ),
      query(
        `SELECT i.id, i.title, i.status, i.priority, i.verification_status, i.acknowledged_at,
                i.resolution_deadline, i.city, i.ward, i.created_at,
                c.name AS category, d.name AS department,
                CONCAT(u.full_name, ' (', u.id, ')') AS reporter
         FROM issues i
         LEFT JOIN issue_categories c ON c.id = i.category_id
         LEFT JOIN departments d ON d.id = i.department_id
         LEFT JOIN users u ON u.id = i.reporter_id
         WHERE i.deleted_at IS NULL
         ORDER BY i.created_at DESC
         LIMIT 10`,
      ),
      query(
        `SELECT d.id, d.name, d.description,
                COUNT(i.id) AS total,
                SUM(i.deleted_at IS NULL AND i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS open_count,
                SUM(i.deleted_at IS NULL AND i.status = 'RESOLVED') AS resolved_count,
                SUM(i.deleted_at IS NULL AND i.resolution_deadline IS NOT NULL AND i.resolution_deadline < NOW()
                    AND i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS late_count,
                ROUND(AVG(CASE WHEN i.deleted_at IS NULL AND i.status = 'RESOLVED' AND i.resolved_at IS NOT NULL
                               THEN TIMESTAMPDIFF(HOUR, i.created_at, i.resolved_at) END), 1) AS avg_resolution_hours
         FROM departments d
         LEFT JOIN issues i ON i.department_id = d.id
         GROUP BY d.id, d.name, d.description
         ORDER BY open_count DESC`,
      ),
      query(
        `SELECT ish.issue_id, ish.from_status, ish.to_status, ish.note, ish.created_at,
                COALESCE(u.full_name, 'System') AS actor_name, i.title
         FROM issue_status_history ish
         LEFT JOIN users u ON u.id = ish.changed_by
         JOIN issues i ON i.id = ish.issue_id
         WHERE i.deleted_at IS NULL
         ORDER BY ish.created_at DESC
         LIMIT 10`,
      ),
    ]);

  return {
    stats: {
      users: users[0].n,
      issues: issues[0].n,
      openIssues: open[0].n,
      resolvedIssues: resolved[0].n,
      criticalIssues: critical[0].n,
      departments: departments[0].n,
      resolutionRate: resolutionRate[0]?.rate ?? 0,
      avgResolutionHours: Math.round(avgResolution[0]?.avg_hours ?? 0),
      slaCompliance: slaCompliance[0]?.rate ?? 0,
      archivedIssues: archived[0].n,
    },
    needsAttention: {
      pendingReview: needsAttention[0]?.pending_review ?? 0,
      late: needsAttention[0]?.late ?? 0,
      unacknowledged: needsAttention[0]?.unacknowledged ?? 0,
      freshSubmissions: needsAttention[0]?.fresh_submissions ?? 0,
    },
    verification: verificationBreakdown.reduce((acc, r) => {
      acc[r.verification_status] = r.n;
      return acc;
    }, {}),
    recentReports,
    departmentPerformance: deptPerformance,
    recentActivity,
  };
}