import { query, transaction } from '../config/database.js';

export async function insertAuditLog(entry) {
  await query(
    `INSERT INTO audit_logs
      (actor_id, actor_role, action, resource_type, resource_id, old_value, new_value, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actorId ?? null,
      entry.actorRole ?? null,
      entry.action,
      entry.resourceType ?? null,
      entry.resourceId ?? null,
      entry.oldValue != null ? JSON.stringify(entry.oldValue) : null,
      entry.newValue != null ? JSON.stringify(entry.newValue) : null,
      entry.ip ?? null,
      entry.userAgent ?? null,
    ],
  );
}

export async function listAuditLogs({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    query(
      `SELECT al.*, u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    ),
    query('SELECT COUNT(*) AS n FROM audit_logs'),
  ]);

  return {
    logs: rows,
    total: total[0]?.n ?? 0,
    page,
    pages: Math.ceil((total[0]?.n ?? 0) / limit),
  };
}

/** Run a repository action and optionally attach an audit log in the same transaction. */
export async function withAudit({ req, action, resourceType, resourceId, oldValue, newValue, work }) {
  return transaction(async (conn) => {
    const result = await work(conn);
    await insertAuditOnConn(conn, { req, action, resourceType, resourceId, oldValue, newValue });
    return result;
  });
}

/** Insert an audit log row using an existing connection (for custom transactions). */
export async function insertAuditOnConn(conn, { req, action, resourceType, resourceId, oldValue, newValue }) {
  await conn.execute(
    `INSERT INTO audit_logs
      (actor_id, actor_role, action, resource_type, resource_id, old_value, new_value, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req?.user?.id ?? null,
      req?.user?.roles?.[0]?.name ?? null,
      action,
      resourceType,
      resourceId,
      oldValue != null ? JSON.stringify(oldValue) : null,
      newValue != null ? JSON.stringify(newValue) : null,
      req?.ip ?? null,
      req?.get?.('user-agent') || null,
    ],
  );
}