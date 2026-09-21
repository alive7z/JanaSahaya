import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import { listUsers, assignRole, getUser, getUserByEmail, getUserRoles, updateProfile } from '../repositories/user.repository.js';
import { listAuditLogs } from '../repositories/audit.repository.js';
import { listOpenReports, resolveReport, hideComment } from '../repositories/comment.repository.js';
import * as deptService from '../services/department.service.js';
import { routeDepartmentForCategory, listDepartments, createDepartment, updateDepartment, updateCategoryRouting, departmentOfficers } from '../services/department.service.js';
import { changeStatus, assignIssueOfficerToIssue } from '../services/issue.service.js';
import { withAudit } from '../repositories/audit.repository.js';
import { slaViolations, slaWarnings } from '../services/sla.service.js';
import { getIssue } from '../repositories/issue.repository.js';
import { hashPassword } from '../utils/password.js';
import { query } from '../config/database.js';

export const users = asyncHandler(async (req, res) => {
  const result = await listUsers({
    page: Math.max(parseInt(req.query.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100),
    search: req.query.search,
  });
  success(res, 200, 'Users fetched', result);
});

export const createOfficer = asyncHandler(async (req, res) => {
  const existing = await getUserByEmail(req.body.email?.toLowerCase());
  if (existing) throw new AppError(409, 'User already exists');

  const passwordHash = await hashPassword(req.body.password || 'Officer@123456');
  const [result] = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, city) VALUES (?, ?, ?, ?, ?)`,
    [req.body.full_name, req.body.email.toLowerCase(), req.body.phone ?? null, passwordHash, req.body.city ?? null],
  );
  await assignRole(result.insertId, 'OFFICER', req.body.department_id);

  await withAudit({
    req,
    action: 'USER_CREATE_OFFICER',
    resourceType: 'user',
    resourceId: result.insertId,
    newValue: { department_id: req.body.department_id },
    work: async () => result.insertId,
  });

  success(res, 201, 'Officer created', { id: result.insertId });
});

export const assignUserRole = asyncHandler(async (req, res) => {
  const { user_id, role, department_id } = req.body;
  if (!['CITIZEN', 'OFFICER', 'ADMIN'].includes(role)) {
    throw new AppError(422, 'Invalid role');
  }
  await ensureNotLastAdminWhenDemoting(user_id, role);
  await assignRole(user_id, role, department_id ?? null);
  await withAudit({
    req,
    action: 'USER_ROLE_CHANGE',
    resourceType: 'user',
    resourceId: user_id,
    newValue: { role, department_id },
    work: async () => user_id,
  });
  success(res, 200, 'Role assigned');
});

export const toggleBan = asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  if (String(user.id) === String(req.user.id)) {
    throw new AppError(422, 'You cannot ban your own account');
  }
  // Do not allow banning the last active admin.
  const adminRow = (await query(
    `SELECT COUNT(DISTINCT ur.user_id) AS n
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     JOIN users u ON u.id = ur.user_id
     WHERE r.name = 'ADMIN' AND u.is_banned = 0`,
  ))[0];
  const nextBanned = !user.is_banned;
  const targetAdmin = (await query(
    `SELECT COUNT(*) AS n FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = 'ADMIN'`,
    [user.id],
  ))[0];
  if (nextBanned && targetAdmin.n > 0 && adminRow.n <= 1) {
    throw new AppError(422, 'Cannot ban the last remaining admin');
  }
  await query('UPDATE users SET is_banned = IF(is_banned = 1, 0, 1) WHERE id = ?', [req.params.id]);
  await withAudit({
    req,
    action: 'USER_BAN_TOGGLE',
    resourceType: 'user',
    resourceId: req.params.id,
    newValue: { is_banned: Number(!user.is_banned) },
    work: async () => req.params.id,
  });
  success(res, 200, 'User ban status toggled');
});

async function ensureNotLastAdminWhenDemoting(userId, nextRole) {
  const targetAdmin = (await query(
    `SELECT COUNT(*) AS n FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = 'ADMIN'`,
    [userId],
  ))[0];
  if (targetAdmin.n === 0 || nextRole === 'ADMIN') return;
  const adminRow = (await query(
    `SELECT COUNT(DISTINCT ur.user_id) AS n
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     JOIN users u ON u.id = ur.user_id
     WHERE r.name = 'ADMIN' AND u.is_banned = 0`,
  ))[0];
  if (adminRow.n <= 1) {
    throw new AppError(422, 'Cannot demote the last remaining admin');
  }
}

export const departments = asyncHandler(async (_req, res) => {
  const list = await listDepartments();
  success(res, 200, 'Departments fetched', { departments: list });
});

export const departmentDetail = asyncHandler(async (req, res) => {
  const dept = await deptService.getDepartment(req.params.id);
  const officers = await departmentOfficers(req.params.id);
  if (!dept) throw new AppError(404, 'Department not found');
  success(res, 200, 'Department fetched', { department: dept, officers });
});

export const createDept = asyncHandler(async (req, res) => {
  const id = await createDepartment(req.body);
  await withAudit({ req, action: 'DEPT_CREATE', resourceType: 'department', resourceId: id, newValue: req.body, work: async () => id });
  success(res, 201, 'Department created', { id });
});

export const updateDept = asyncHandler(async (req, res) => {
  await updateDepartment(req.params.id, req.body);
  await withAudit({ req, action: 'DEPT_UPDATE', resourceType: 'department', resourceId: req.params.id, newValue: req.body, work: async () => req.params.id });
  success(res, 200, 'Department updated');
});

export const categoryRouting = asyncHandler(async (req, res) => {
  await updateCategoryRouting(req.params.id, req.body.department_id ?? null);
  const dept = await routeDepartmentForCategory(req.params.id);
  await withAudit({ req, action: 'CATEGORY_ROUTING', resourceType: 'category', resourceId: req.params.id, newValue: { department_id: req.body.department_id }, work: async () => req.params.id });
  success(res, 200, 'Category routing updated', { departmentId: dept });
});

export const reassignIssue = asyncHandler(async (req, res) => {
  const issue = await getIssue(req.params.id);
  if (!issue) throw new AppError(404, 'Issue not found');

  const result = await withAudit({
    req,
    action: 'ISSUE_REASSIGN',
    resourceType: 'issue',
    resourceId: req.params.id,
    oldValue: { department_id: issue.department_id },
    newValue: { department_id: req.body.department_id, officer_id: req.body.officer_id ?? null },
    work: async () =>
      assignIssueOfficerToIssue({
        issueId: req.params.id,
        officerId: req.body.officer_id,
        assignedBy: req.user.id,
        req,
      }),
  });
  success(res, 200, 'Issue reassigned', result);
});

export const adminStatusChange = asyncHandler(async (req, res) => {
  const result = await withAudit({
    req,
    action: 'ADMIN_STATUS_CHANGE',
    resourceType: 'issue',
    resourceId: req.params.id,
    newValue: { status: req.body.status },
    work: async () =>
      changeStatus({
        issueId: req.params.id,
        toStatus: req.body.status,
        note: req.body.note ?? null,
        actor: 'USER',
        actorId: req.user.id,
        req,
      }),
  });
  success(res, 200, 'Status updated', result);
});

export const moderation = asyncHandler(async (_req, res) => {
  const reports = await listOpenReports();
  success(res, 200, 'Reports fetched', { reports });
});

export const moderateComment = asyncHandler(async (req, res) => {
  const reportId = req.params.reportId;
  const { action, comment_id } = req.body;
  if (action === 'hide') {
    if (!comment_id) throw new AppError(422, 'comment_id is required to hide');
    await hideComment(comment_id);
    await resolveReport(reportId, req.user.id, 'RESOLVED');
  } else {
    const status = action === 'dismiss' ? 'DISMISSED' : 'RESOLVED';
    await resolveReport(reportId, req.user.id, status);
  }
  await withAudit({
    req,
    action: 'MODERATE_COMMENT',
    resourceType: 'report',
    resourceId: reportId,
    newValue: { action, comment_id },
    work: async () => reportId,
  });
  success(res, 200, 'Moderation action applied');
});

export const auditLogs = asyncHandler(async (req, res) => {
  const result = await listAuditLogs({
    page: Math.max(parseInt(req.query.page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100),
  });
  success(res, 200, 'Audit logs fetched', result);
});

/** Moderate a reported issue: archive it (with reason) or dismiss the report. */
export const moderateIssueReport = asyncHandler(async (req, res) => {
  const { action, reason, issue_id } = req.body;
  if (action === 'archive') {
    if (!reason?.trim()) throw new AppError(422, 'Archive reason is required');
    await issueService.archiveIssue({
      issueId: issue_id,
      actorId: req.user.id,
      req,
      reason: reason.trim(),
    });
    await commentService.resolveReport(req.params.reportId, req.user.id, 'RESOLVED');
  } else {
    await commentService.resolveReport(req.params.reportId, req.user.id, action === 'dismiss' ? 'DISMISSED' : 'RESOLVED');
  }
  await withAudit({
    req,
    action: 'MODERATE_ISSUE',
    resourceType: 'report',
    resourceId: req.params.reportId,
    newValue: { action, issue_id, reason },
    work: async () => req.params.reportId,
  });
  success(res, 200, 'Moderation action applied');
});

/** List open escalations across all issues (needs-attention). */
export const escalationsAdmin = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT e.id, e.issue_id, e.escalation_level, e.reason, e.status,
            e.created_at, e.acknowledged_by, e.acknowledged_at,
            i.title AS issue_title, i.status AS issue_status
     FROM issue_escalations e
     JOIN issues i ON i.id = e.issue_id
     WHERE e.status = 'OPEN' AND i.deleted_at IS NULL
     ORDER BY e.created_at DESC`,
  );
  success(res, 200, 'Escalations fetched', { escalations: rows, open: rows.length });
});

/** Acknowledge an escalation (admin). */
export const acknowledgeEscalation = asyncHandler(async (req, res) => {
  const result = await reviewService.acknowledgeEscalation({
    escalationId: req.params.id,
    actorId: req.user.id,
    req,
  });
  success(res, 200, 'Escalation acknowledged', result);
});

/** Report detail with abuse/trust signals (shows WHY). */
export const abuseSignalsForUser = asyncHandler(async (req, res) => {
  const result = await abuseService.reporterTrustDetail(req.params.id);
  success(res, 200, 'Reporter trust fetched', result);
});

/** Issue report → also record HOW often a reporter’s content gets flagged. */
export const issuesForUserAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const result = await issueService.listIssuesForAdminByReporter({
    userId: req.params.id,
    page,
    limit,
  });
  success(res, 200, 'Issues fetched', result);
});

export const slaStatus = asyncHandler(async (_req, res) => {
  const [violations, warnings] = await Promise.all([slaViolations(), slaWarnings()]);
  success(res, 200, 'SLA status fetched', { violations, warnings });
});

export const categoriesAdmin = asyncHandler(async (req, res) => {
  const { categoriesAll } = await import('../repositories/issue.repository.js');
  const categories = await categoriesAll();
  const departments = await listDepartments();
  success(res, 200, 'Categories fetched', { categories, departments });
});

export const createCategory = asyncHandler(async (req, res) => {
  const slug = req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [result] = await query(
    `INSERT INTO issue_categories (name, slug, severity, department_id, description)
     VALUES (?, ?, ?, ?, ?)`,
    [req.body.name, slug, req.body.severity ?? 3, req.body.department_id ?? null, req.body.description ?? null],
  );
  await withAudit({ req, action: 'CATEGORY_CREATE', resourceType: 'category', resourceId: result.insertId, newValue: req.body, work: async () => result.insertId });
  success(res, 201, 'Category created', { id: result.insertId });
});

/** Admin-only filterable issue list with summary counts. */
export const adminIssueList = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  const filters = req.query;
  if (filters.status) where.push('i.status = ?'), params.push(filters.status);
  if (filters.priority) where.push('i.priority = ?'), params.push(filters.priority);
  if (filters.departmentId) where.push('i.department_id = ?'), params.push(filters.departmentId);
  if (filters.categoryId) where.push('i.category_id = ?'), params.push(filters.categoryId);
  if (filters.search) {
    where.push('(i.title LIKE ? OR i.description LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.from) where.push('i.created_at >= ?'), params.push(filters.from);
  if (filters.to) where.push('i.created_at <= ?'), params.push(filters.to);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, totalRows] = await Promise.all([
    query(
      `SELECT i.id, i.title, i.status, i.priority, i.city, i.ward,
              i.vote_count, i.created_at, i.resolved_at,
              c.name AS category,
              d.name AS department,
              CONCAT(u.full_name, ' (', u.id, ')') AS reporter
       FROM issues i
       LEFT JOIN issue_categories c ON c.id = i.category_id
       LEFT JOIN departments d ON d.id = i.department_id
       LEFT JOIN users u ON u.id = i.reporter_id
       ${whereSql}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    query(`SELECT COUNT(*) AS n FROM issues i ${whereSql}`, params),
  ]);

  const summary = (await query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'RESOLVED') AS resolved,
            SUM(status = 'IN_PROGRESS') AS inProgress,
            SUM(status = 'OPEN') AS open,
            SUM(status = 'SUBMITTED') AS submitted
     FROM issues`,
  ))[0];

  success(res, 200, 'Issues fetched', {
    issues: rows,
    total: totalRows[0]?.n ?? 0,
    page,
    pages: Math.ceil((totalRows[0]?.n ?? 0) / limit),
    summary,
  });
});

export const userDetail = asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  const roles = await getUserRoles(req.params.id);
  success(res, 200, 'User fetched', { user, roles });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) throw new AppError(404, 'User not found');

  const changes = {};
  if (req.body.full_name !== undefined) changes.fullName = req.body.full_name;
  if (req.body.phone !== undefined) changes.phone = req.body.phone;
  if (req.body.city !== undefined) changes.city = req.body.city;
  if (req.body.ward !== undefined) changes.ward = req.body.ward;

  const email = req.body.email?.toLowerCase();
  if (email && email !== user.email) {
    const clash = await getUserByEmail(email);
    if (clash && String(clash.id) !== String(user.id)) throw new AppError(409, 'Email already in use');
    changes.email = email;
  }

  if (Object.keys(changes).length === 0) throw new AppError(422, 'Nothing to update');
  await updateProfile(user.id, changes);

  await withAudit({
    req,
    action: 'ADMIN_USER_UPDATE',
    resourceType: 'user',
    resourceId: user.id,
    oldValue: { full_name: user.full_name, email: user.email, phone: user.phone, city: user.city, ward: user.ward, is_banned: user.is_banned },
    newValue: changes,
    work: async () => user.id,
  });
  success(res, 200, 'User updated', { user: { ...user, ...changes, email } });
});

export const officersList = asyncHandler(async (_req, res) => {
  const officers = await query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.city, u.is_banned,
            d.id AS department_id, d.name AS department,
            (SELECT COUNT(*) FROM issues i WHERE i.assigned_officer_id = u.id AND i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS open_issues,
            (SELECT COUNT(*) FROM issues i WHERE i.assigned_officer_id = u.id AND i.status = 'RESOLVED') AS resolved_issues
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id AND r.name = 'OFFICER'
     LEFT JOIN departments d ON d.id = ur.department_id
     ORDER BY open_issues DESC, u.created_at ASC`,
  );
  success(res, 200, 'Officers fetched', { officers });
});

export const slaRules = asyncHandler(async (_req, res) => {
  const rules = await query('SELECT id, priority, hours, description FROM sla_rules ORDER BY hours ASC');
  success(res, 200, 'SLA rules fetched', { rules });
});

export const updateSlaRule = asyncHandler(async (req, res) => {
  const existing = await query('SELECT * FROM sla_rules WHERE id = ?', [req.params.id]);
  if (!existing[0]) throw new AppError(404, 'SLA rule not found');
  const hours = req.body.hours !== undefined ? parseInt(req.body.hours, 10) : existing[0].hours;
  const description = req.body.description !== undefined ? req.body.description : existing[0].description;
  if (!Number.isFinite(hours) || hours <= 0) throw new AppError(422, 'hours must be a positive integer');

  await query('UPDATE sla_rules SET hours = ?, description = ? WHERE id = ?', [hours, description, req.params.id]);
  // Re-evaluate deadlines for open issues assigned to this priority.
  await query(
    `UPDATE issues i
     JOIN sla_rules s ON s.priority = i.priority
     SET i.resolution_deadline = DATE_ADD(i.created_at, INTERVAL s.hours HOUR)
     WHERE i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')`
  );
  await withAudit({
    req,
    action: 'SLA_RULE_UPDATE',
    resourceType: 'sla_rule',
    resourceId: req.params.id,
    oldValue: { hours: existing[0].hours, description: existing[0].description },
    newValue: { hours, description },
    work: async () => req.params.id,
  });
  success(res, 200, 'SLA rule updated', { hours, description });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const existing = await query('SELECT * FROM issue_categories WHERE id = ?', [req.params.id]);
  if (!existing[0]) throw new AppError(404, 'Category not found');
  const name = req.body.name ?? existing[0].name;
  const severity = req.body.severity !== undefined ? parseInt(req.body.severity, 10) : existing[0].severity;
  const description = req.body.description !== undefined ? req.body.description : existing[0].description;

  await query(
    'UPDATE issue_categories SET name = ?, severity = ?, description = ? WHERE id = ?',
    [name, severity, description, req.params.id],
  );
  await withAudit({
    req,
    action: 'CATEGORY_UPDATE',
    resourceType: 'category',
    resourceId: req.params.id,
    oldValue: { name: existing[0].name, severity: existing[0].severity, description: existing[0].description },
    newValue: { name, severity, description },
    work: async () => req.params.id,
  });
  success(res, 200, 'Category updated');
});

export const adminIssueDetail = asyncHandler(async (req, res) => {
  const issue = await getIssue(req.params.id);
  if (!issue) throw new AppError(404, 'Issue not found');
  success(res, 200, 'Issue fetched', { issue });
});