import { query, getOne } from '../config/database.js';
import { storedUploadPath } from '../utils/uploads.js';

export const ISSUE_BASE_SELECT = `
  SELECT i.*,
         c.name          AS category_name,
         c.slug          AS category_slug,
         c.severity      AS category_severity,
         d.name          AS department_name,
         u.full_name     AS reporter_name,
         u.profile_picture AS reporter_picture
  FROM issues i
  JOIN issue_categories c ON c.id = i.category_id
  LEFT JOIN departments d ON d.id = i.department_id
  LEFT JOIN users u ON u.id = i.reporter_id
`;

export async function createIssue({ issue }) {
  const result = await query(
    `INSERT INTO issues (
       title, description, category_id, reporter_id,
       latitude, longitude, location_source, address, city, ward,
       status, priority, priority_score, resolution_deadline, last_activity_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      issue.title,
      issue.description,
      issue.categoryId,
      issue.reporterId,
      issue.latitude,
      issue.longitude,
      issue.locationSource ?? 'map',
      issue.address ?? null,
      issue.city ?? null,
      issue.ward ?? null,
      issue.status ?? 'SUBMITTED',
      issue.priority ?? 'MEDIUM',
      issue.priorityScore ?? 0,
      issue.deadline ?? null,
      new Date(),
    ],
  );
  return result.insertId;
}

export async function getIssue(id) {
  return getOne(`${ISSUE_BASE_SELECT} WHERE i.id = ?`, [id]);
}

export const STATUS_OPEN = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'REOPENED',
];

export function buildIssueListQuery({ filters, user = null }) {
  const where = ['1 = 1', 'i.deleted_at IS NULL'];
  const params = [];

  if (filters.statusFilters?.length) {
    where.push(`i.status IN (${filters.statusFilters.map(() => '?').join(',')})`);
    params.push(...filters.statusFilters);
  }
  if (filters.verificationStatus) {
    where.push('i.verification_status = ?');
    params.push(filters.verificationStatus);
  }
  if (filters.categoryId) {
    where.push('i.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.departmentId) {
    where.push('i.department_id = ?');
    params.push(filters.departmentId);
  }
  if (filters.priority) {
    where.push('i.priority = ?');
    params.push(filters.priority);
  }
  if (filters.ward) {
    where.push('i.ward = ?');
    params.push(filters.ward);
  }
  if (filters.city) {
    where.push('i.city = ?');
    params.push(filters.city);
  }
  if (filters.reporterId) {
    where.push('i.reporter_id = ?');
    params.push(filters.reporterId);
  }
  if (filters.officerId) {
    where.push('i.assigned_officer_id = ?');
    params.push(filters.officerId);
  }
  if (filters.onlyVotedBy && user) {
    where.push(`i.id IN (SELECT issue_id FROM issue_votes WHERE user_id = ?)`);
    params.push(user.id);
  }
  if (filters.onlyFollowedBy && user) {
    where.push(`i.id IN (SELECT issue_id FROM issue_followers WHERE user_id = ?)`);
    params.push(user.id);
  }
  if (filters.search) {
    const like = `%${filters.search}%`;
    where.push(`(i.title LIKE ? OR i.description LIKE ? OR i.address LIKE ? OR i.ward LIKE ? OR i.city LIKE ?)`);
    params.push(like, like, like, like, like);
  }
  if (filters.createdFrom) {
    where.push('i.created_at >= ?');
    params.push(new Date(filters.createdFrom));
  }
  if (filters.createdTo) {
    where.push('i.created_at <= ?');
    params.push(new Date(filters.createdTo));
  }
  if (filters.near) {
    const R = 6371;
    const { lat, lng, radiusMetres } = filters.near;
    const degLat = radiusMetres / 1000 / R * (180 / Math.PI);
    const degLng = radiusMetres / 1000 / R * (180 / Math.PI) / Math.max(Math.abs(Math.cos((lat * Math.PI) / 180)), 0.01);
    where.push(
      `i.latitude BETWEEN ? AND ? AND i.longitude BETWEEN ? AND ?`,
    );
    params.push(lat - degLat, lat + degLat, lng - degLng, lng + degLng);
  }

  const orderMap = {
    newest: 'i.created_at DESC',
    oldest: 'i.created_at ASC',
    most_supported: 'i.vote_count DESC, i.created_at DESC',
    priority: 'i.priority_score DESC, i.created_at DESC',
    nearest: 'i.last_activity_at DESC',
  };
  let orderBy = orderMap[filters.sort] || 'i.created_at DESC';

  if (filters.near && filters.sort === 'nearest') {
    // Approx distance for sorting using equirectangular projection.
    const { lat, lng } = filters.near;
    orderBy =
      `ABS(i.latitude - ${lat}) + ABS(i.longitude - ${lng}) ASC, i.created_at DESC`;
  }

  const context = {
    sql: `${ISSUE_BASE_SELECT} WHERE ${where.join(' AND ')}`,
    params,
    orderBy,
  };

  if (filters.departmentFilter) {
    context.sql += ' AND i.department_id = ?';
    context.params.push(filters.departmentFilter.department_id);
  }

  return context;
}

export async function listIssues(filters) {
  const { sql, params, orderBy } = buildIssueListQuery({ filters });
  const offset = (filters.page - 1) * filters.limit;
  const countSql = sql.replace(
    /SELECT i\.\*,[\s\S]*?FROM issues i/s,
    'SELECT COUNT(*) AS n FROM issues i',
  );

  const [rows, total] = await Promise.all([
    query(`${sql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...params, filters.limit, offset]),
    query(countSql, params),
  ]);

  return {
    issues: rows,
    total: total[0]?.n ?? 0,
    page: filters.page,
    limit: filters.limit,
    pages: Math.ceil((total[0]?.n ?? 0) / filters.limit),
  };
}

export async function getIssueProximity({ latitude, longitude, categoryId, excludeId = null }) {
  const params = [categoryId];
  let sql = `
    SELECT i.id, i.title, i.latitude, i.longitude, i.category_id, i.status, i.vote_count, i.created_at,
           i.duplicate_of_id
    FROM issues i
    WHERE i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
      AND i.category_id = ?
      AND i.duplicate_of_id IS NULL
  `;
  if (excludeId) {
    sql += ' AND i.id <> ?';
    params.push(excludeId);
  }
  const rows = await query(sql, params);
  return rows;
}

export async function getDuplicateCandidatesForIssue(issueId) {
  return query(
    `SELECT dc.duplicate_of_id AS id, i.title, i.status, i.vote_count, i.created_at,
            dc.score, dc.distance_metres, dc.text_similarity
     FROM duplicate_candidates dc
     JOIN issues i ON i.id = dc.duplicate_of_id
     WHERE dc.issue_id = ?
     ORDER BY dc.score DESC`,
    [issueId],
  );
}

export async function addDuplicateCandidate(entry) {
  await query(
    `INSERT INTO duplicate_candidates
       (issue_id, duplicate_of_id, score, category_hit, distance_metres, text_similarity)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.issueId, entry.duplicateOfId, entry.score, entry.categoryHit ? 1 : 0, entry.distanceMetres, entry.textSimilarity],
  );
}

export async function markDuplicate(issueId, duplicateOfId, userId) {
  await query('UPDATE issues SET status = ?, duplicate_of_id = ? WHERE id = ?', ['DUPLICATE', duplicateOfId, issueId]);
  await query(
    'INSERT INTO issue_status_history (issue_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
    [issueId, 'SUBMITTED', 'DUPLICATE', userId, 'Marked as duplicate of issue #' + duplicateOfId],
  );
}

export async function updateIssue(id, fields, conn = null) {
  const allowed = {
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    priority_score: 'priorityScore',
    department_id: 'departmentId',
    assigned_officer_id: 'assignedOfficerId',
    resolution_deadline: 'deadline',
    resolved_at: 'resolvedAt',
    closed_at: 'closedAt',
    duplicate_of_id: 'duplicateOfId',
    vote_count: 'voteCount',
    comment_count: 'commentCount',
    follower_count: 'followerCount',
    last_activity_at: 'lastActivityAt',
    verification_status: 'verificationStatus',
    verified_by: 'verifiedBy',
    verified_at: 'verifiedAt',
    verification_note: 'verificationNote',
    acknowledged_by: 'acknowledgedBy',
    acknowledged_at: 'acknowledgedAt',
    rejection_reason: 'rejectionReason',
    deleted_at: 'deletedAt',
    deleted_by: 'deletedBy',
    deletion_reason: 'deletionReason',
  };
  const sets = [];
  const params = [];
  for (const [col, prop] of Object.entries(allowed)) {
    if (fields[prop] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(fields[prop]);
    }
  }
  if (sets.length === 0) return;
  params.push(id);
  const sql = `UPDATE issues SET ${sets.join(', ')} WHERE id = ?`;
  if (conn) return conn.execute(sql, params);
  return query(sql, params);
}

export function updateVoteCount(conn, id, delta) {
  return conn.execute(
    'UPDATE issues SET vote_count = vote_count + ? WHERE id = ?',
    [delta, id],
  );
}

export function updateFollowerCount(conn, id, delta) {
  return conn.execute(
    'UPDATE issues SET follower_count = follower_count + ? WHERE id = ?',
    [delta, id],
  );
}

export async function addStatusHistory({ issueId, fromStatus, toStatus, changedBy, note, conn = null }) {
  const run = (c) =>
    c.execute(
      'INSERT INTO issue_status_history (issue_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [issueId, fromStatus ?? null, toStatus, changedBy ?? null, note ?? null],
    );
  if (conn) return run(conn);
  return query(
    'INSERT INTO issue_status_history (issue_id, from_status, to_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
    [issueId, fromStatus ?? null, toStatus, changedBy ?? null, note ?? null],
  );
}

export async function getTimeline(issueId) {
  const rows = await query(
    `SELECT ish.*, u.full_name AS actor_name
     FROM issue_status_history ish
     LEFT JOIN users u ON u.id = ish.changed_by
     WHERE ish.issue_id = ?
     ORDER BY ish.created_at ASC`,
    [issueId],
  );

  const [images, assignments, resolutions] = await Promise.all([
    query(
      'SELECT id, filename, filepath, mime_type, size, is_resolution_evidence, created_at FROM issue_images WHERE issue_id = ? ORDER BY created_at ASC',
      [issueId],
    ),
    query(
      `SELECT ia.*, d.name AS department_name, u.full_name AS officer_name
       FROM issue_assignments ia
       LEFT JOIN departments d ON d.id = ia.department_id
       LEFT JOIN users u ON u.id = ia.officer_id
       WHERE ia.issue_id = ?
       ORDER BY ia.assigned_at ASC`,
      [issueId],
    ),
    query(
      `SELECT ir.*, u.full_name AS officer_name
       FROM issue_resolutions ir
       LEFT JOIN users u ON u.id = ir.officer_id
       WHERE ir.issue_id = ?
       ORDER BY ir.created_at ASC`,
      [issueId],
    ),
  ]);

  return { events: rows, images, assignments, resolutions };
}

export async function creatorOf(issueId, userId) {
  const row = await getOne('SELECT 1 FROM issues WHERE id = ? AND reporter_id = ?', [issueId, userId]);
  return !!row;
}

export async function getIssueImages(issueId) {
  return query(
    'SELECT id, filename, filepath, mime_type, size, is_resolution_evidence FROM issue_images WHERE issue_id = ? ORDER BY created_at ASC',
    [issueId],
  );
}

export async function insertIssueImages(issueId, files, { resolutionEvidence = false, uploadedBy = null } = {}) {
  for (const f of files) {
    await query(
      `INSERT INTO issue_images (issue_id, filename, filepath, mime_type, size, is_resolution_evidence, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [issueId, f.filename, storedUploadPath(f.path), f.mimetype, f.size, resolutionEvidence ? 1 : 0, uploadedBy],
    );
  }
}

export async function departmentsAll() {
  return query('SELECT id, name, description, is_active FROM departments ORDER BY name');
}

export async function categoriesAll() {
  return query(
    `SELECT c.*, d.name AS department_name
     FROM issue_categories c
     LEFT JOIN departments d ON d.id = c.department_id
     WHERE c.is_active = 1
     ORDER BY c.severity DESC, c.name`,
  );
}

export async function insertAssignment({ issueId, departmentId, officerId, assignedBy }, conn = null) {
  const sql = `INSERT INTO issue_assignments (issue_id, department_id, officer_id, assigned_by, assigned_at)
     VALUES (?, ?, ?, ?, NOW())`;
  if (conn) return conn.execute(sql, [issueId, departmentId ?? null, officerId ?? null, assignedBy ?? null]);
  return query(sql, [issueId, departmentId ?? null, officerId ?? null, assignedBy ?? null]);
}

export async function createResolution({ issueId, officerId, note, imagePath }, conn = null) {
  const sql = `INSERT INTO issue_resolutions (issue_id, officer_id, note, image_path)
     VALUES (?, ?, ?, ?)`;
  if (conn) {
    const [result] = await conn.execute(sql, [issueId, officerId, note, imagePath ?? null]);
    return result.insertId;
  }
  const result = await query(sql, [issueId, officerId, note, imagePath ?? null]);
  return result.insertId;
}

export async function getOpenIssuesForDepartment(departmentId) {
  return query(
    `SELECT i.id, i.title, i.status, i.priority, i.priority_score, i.resolution_deadline, i.created_at
     FROM issues i
     WHERE i.department_id = ? AND i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
     ORDER BY i.priority_score DESC, i.created_at ASC`,
    [departmentId],
  );
}

export async function confirmResolution({ conn, issueId, resolutionId, userId, confirmed }) {
  await conn.execute(
    `INSERT INTO issue_confirmation_votes (issue_id, user_id, resolution_id, confirmed)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE confirmed = VALUES(confirmed), resolution_id = VALUES(resolution_id)`,
    [issueId, userId, resolutionId ?? null, confirmed ? 1 : 0],
  );
  const totalField = confirmed ? 'confirmed_count' : 'reopened_count';
  await conn.execute(
    `UPDATE issue_resolutions SET ${totalField} = (
       SELECT COUNT(*) FROM issue_confirmation_votes
       WHERE issue_id = ? AND resolution_id = ? AND confirmed = ?
     ) WHERE id = ?`,
    [issueId, resolutionId, confirmed ? 1 : 0, resolutionId],
  );
}

export async function isDuplicateOrClosed(issueId) {
  const row = await getOne(
    "SELECT 1 FROM issues WHERE id = ? AND status IN ('DUPLICATE','CLOSED','REJECTED')",
    [issueId],
  );
  return !!row;
}
