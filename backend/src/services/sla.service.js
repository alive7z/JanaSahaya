import { query } from '../config/database.js';

export async function getSlaHours(priority) {
  const rows = await query('SELECT hours FROM sla_rules WHERE priority = ?', [priority]);
  return rows[0]?.hours ?? null;
}

export function addDeadline(priority, from = null) {
  // placeholder for calendar-aware logic; actual deadline is set via getSlaHours
  return null;
}

/** Issues where the SLA has been breached. */
export async function slaViolations() {
  return query(
    `SELECT i.id, i.title, i.priority, i.priority_score, i.resolution_deadline, i.status,
            d.name AS department_name, TIMESTAMPDIFF(HOUR, i.resolution_deadline, NOW()) AS hours_overdue
     FROM issues i
     LEFT JOIN departments d ON d.id = i.department_id
     WHERE i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
       AND i.resolution_deadline IS NOT NULL
       AND i.resolution_deadline < NOW()
     ORDER BY i.resolution_deadline ASC`,
  );
}

/** Issues whose deadline is approaching (within 24h). */
export async function slaWarnings() {
  return query(
    `SELECT i.id, i.title, i.priority, i.resolution_deadline, i.status
     FROM issues i
     WHERE i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
       AND i.resolution_deadline IS NOT NULL
       AND i.resolution_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
     ORDER BY i.resolution_deadline ASC`,
  );
}

/** Open escalations for an issue. */
export async function escalationsFor(issueId) {
  return query(
    'SELECT * FROM issue_escalations WHERE issue_id = ? ORDER BY created_at DESC',
    [issueId],
  );
}

export async function createEscalation({ issueId, reason, escalatedToUserId = null }) {
  const result = await query(
    `INSERT INTO issue_escalations (issue_id, escalation_level, reason, escalated_to_user_id)
     SELECT ?, COALESCE(MAX(escalation_level), 0) + 1, ?, ?
     FROM issue_escalations WHERE issue_id = ?`,
    [issueId, reason, escalatedToUserId ?? null, issueId],
  );
  await query('UPDATE issues SET last_activity_at = NOW() WHERE id = ?', [issueId]);
  return result.insertId;
}