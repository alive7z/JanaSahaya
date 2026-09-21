import AppError from '../utils/AppError.js';
import { transaction, query, getOne } from '../config/database.js';
import { computePriority, recordPriority, getPriorityHistory } from './priority.service.js';
import { routeDepartmentForCategory } from './department.service.js';
import { validateTransition } from './status.service.js';
import { detectDuplicates, persistDuplicateCandidates, countNearbyOpen, duplicateCountFor, listCandidates } from './duplicate.service.js';
import {
  getIssue,
  listIssues,
  getTimeline,
  updateIssue,
  addStatusHistory,
  insertAssignment,
  createResolution,
  confirmResolution,
} from '../repositories/issue.repository.js';
import { hasVoted } from '../repositories/vote.repository.js';
import { hasFollowed } from '../repositories/follow.repository.js';
import { getSlaHours } from './sla.service.js';
import { storedUploadPath } from '../utils/uploads.js';
import * as notifier from './notification.service.js';

// Contribution points
const PTS_VALID_ISSUE = 10;
const PTS_ISSUE_RESOLVED = 20;
const PTS_VERIFICATION = 5;
const PTS_DUPLICATE_AVOIDED = 3;

async function ensureCategory(categoryId) {
  const cat = await getOne(
    'SELECT id, name, severity, department_id FROM issue_categories WHERE id = ? AND is_active = 1',
    [categoryId],
  );
  if (!cat) throw new AppError(422, 'Invalid category');
  return cat;
}

export async function checkDuplicates(input) {
  return detectDuplicates(input);
}

export async function createNewIssue({ input, userId, files }) {
  const category = await ensureCategory(input.categoryId);

  // Duplicate detection before creation.
  const duplicateResult = await detectDuplicates({
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    latitude: input.latitude,
    longitude: input.longitude,
  });
  const likely = duplicateResult.candidates.filter((c) => c.isLikelyDuplicate);

  const departmentId = await routeDepartmentForCategory(input.categoryId);

  // Priority engine (new issue: no votes/dups yet, but nearby hotspot counts).
  const nearbyOpenCount = await countNearbyOpen({
    latitude: input.latitude,
    longitude: input.longitude,
  });
  const { score, priority, reasons } = await computePriority({
    issue: null,
    category,
    stats: { voteCount: 0, duplicateCount: 0, nearbyOpenCount, escalationCount: 0, createdAt: new Date() },
  });

  const slaHours = await getSlaHours(priority);
  const deadline = slaHours ? new Date(Date.now() + slaHours * 3600 * 1000) : null;

  const issueId = await transaction(async (conn) => {
    const [result] = await conn.execute(
      `INSERT INTO issues (
         title, description, category_id, reporter_id,
         latitude, longitude, location_source, address, city, ward,
         status, priority, priority_score, department_id, resolution_deadline, last_activity_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, NOW())`,
      [
        input.title,
        input.description,
        input.categoryId,
        userId,
        input.latitude,
        input.longitude,
        input.locationSource,
        input.address ?? null,
        input.city ?? null,
        input.ward ?? null,
        priority,
        score,
        departmentId ?? null,
        deadline,
      ],
    );
    const id = result.insertId;

    await conn.execute(
      `INSERT INTO issue_status_history (issue_id, from_status, to_status, changed_by, note)
       VALUES (?, ?, ?, ?, ?)`,
      [id, null, 'SUBMITTED', userId, 'Issue submitted'],
    );

    if (files?.images && files.images.length) {
      for (const f of files.images) {
        await conn.execute(
          `INSERT INTO issue_images (issue_id, filename, filepath, mime_type, size, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, f.filename, storedUploadPath(f.path), f.mimetype, f.size, userId],
        );
      }
    }

    return id;
  });

  if (likely.length > 0) {
    await persistDuplicateCandidates(issueId, likely);
  }

  // Reward contributor.
  const pool = await import('../config/database.js').then((m) => m.default);
  await pool.execute('UPDATE users SET points = points + ? WHERE id = ?', [PTS_VALID_ISSUE, userId]);

  await recordPriority({ issueId, score, priority, reasons });
  await notifier.notifyDepartmentOfficers(
    departmentId,
    {
      type: 'ISSUE_ASSIGNED',
      title: 'New issue in your department',
      body: `${input.title} (${priority}) has been routed to your department.`,
      link: `/issue/${issueId}`,
      payload: { issueId, priority },
    },
  );

  await notifier.notify(userId, {
    type: 'ADMIN_MESSAGE',
    title: 'Issue submitted',
    body: `Your issue "#${issueId} ${input.title}" was created and routed to the ${category.name} category.`,
    link: `/issue/${issueId}`,
    payload: { issueId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:update', { issueId, action: 'created' });

  return {
    issueId,
    duplicates: { threshold: duplicateResult.threshold, candidates: likely },
    priority: { score, priority, reasons },
  };
}

export async function listIssuesWithFilters(filters) {
  return listIssues(filters);
}

export async function getIssueDetail(issueId, viewerId = null) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');

  const timeline = await getTimeline(issueId);
  const [priorityHistory, dupSubmitter, category] = await Promise.all([
    getPriorityHistory(issueId),
    duplicateCountFor(issueId),
    getOne('SELECT name, severity FROM issue_categories WHERE id = ?', [issue.category_id]),
  ]);
  const duplicates = await listCandidates(issueId);

  let myVote = false;
  let myFollow = false;
  let myConfirmation = null;
  if (viewerId) {
    [myVote, myFollow] = await Promise.all([hasVoted(issueId, viewerId), hasFollowed(issueId, viewerId)]);
    const [confirmRow] = await query(
      'SELECT confirmed FROM issue_confirmation_votes WHERE issue_id = ? AND user_id = ?',
      [issueId, viewerId],
    );
    myConfirmation = confirmRow ? Boolean(confirmRow.confirmed) : null;
  }

  const latestPriority = priorityHistory[0]
    ? {
        score: priorityHistory[0].priority_score,
        priority: priorityHistory[0].priority,
        reasons: Array.isArray(priorityHistory[0].reasons_json)
          ? priorityHistory[0].reasons_json
          : JSON.parse(priorityHistory[0].reasons_json || '[]'),
      }
    : { score: issue.priority_score, priority: issue.priority, reasons: [] };

  return {
    issue,
    category,
    timeline,
    duplicates,
    duplicateCount: dupSubmitter,
    priorityExplanation: latestPriority,
    myVote,
    myFollow,
    myConfirmation,
  };
}

async function writeStatusChange(conn, { issueId, fromStatus, toStatus, changedBy, note }) {
  const changes = { status: toStatus, lastActivityAt: new Date() };
  if (toStatus === 'CLOSED') changes.closedAt = new Date();
  if (toStatus === 'RESOLVED') changes.resolvedAt = new Date();
  await updateIssue(issueId, changes, conn);
  await addStatusHistory({ issueId, fromStatus, toStatus, changedBy: changedBy ?? null, note, conn });
}

export async function changeStatus({ issueId, toStatus, note, actor, actorId, req }) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');

  const roleNames = (req?.user?.roles || []).map((role) => role.name);
  const actorName = actor === 'SYSTEM' ? 'SYSTEM' : roleNames.includes('ADMIN') ? 'ADMIN' : 'OFFICER';
  const departmentMatch =
    actorName === 'ADMIN' ||
    (actorName === 'OFFICER' && issue.department_id === req.user.departmentId);

  validateTransition({ from: issue.status, to: toStatus, actor: actorName, departmentMatch });

  // RESOLVED requires resolution evidence.
  if (toStatus === 'RESOLVED') {
    throw new AppError(422, 'Use the resolve endpoint with evidence to mark an issue resolved');
  }

  const fromStatus = issue.status;
  await transaction(async (conn) => {
    await writeStatusChange(conn, { issueId, fromStatus, toStatus, changedBy: actorId ?? null, note });
  });

  await sendStatusNotifications({ issueId, issue, toStatus, fromStatus, note, actorName });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: fromStatus, to: toStatus, note,
  });

  return { from: fromStatus, to: toStatus };
}

export async function acceptByOfficer({ issueId, officerId, req }) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');

  const roleNames = (req.user.roles || []).map((role) => role.name);
  const actorName = roleNames.includes('ADMIN') ? 'ADMIN' : 'OFFICER';
  const departmentMatch =
    actorName === 'ADMIN' || (actorName === 'OFFICER' && issue.department_id === req.user.departmentId);
  if (!departmentMatch) throw new AppError(403, 'You can only manage issues in your department');

  if (['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(issue.status)) {
    throw new AppError(422, `Cannot accept an issue in ${issue.status} state`);
  }

  const claimable = ['SUBMITTED', 'UNDER_REVIEW', 'REOPENED'].includes(issue.status);

  // Already owned by someone else: no stealing.
  if (!claimable && issue.assigned_officer_id && String(issue.assigned_officer_id) !== String(officerId)) {
    throw new AppError(409, 'Issue has already been accepted by another officer.');
  }

  const finalStatus = claimable ? 'IN_PROGRESS' : issue.status;

  // Atomically claim the issue. Only one officer can own it.
  const claimed = await transaction(async (conn) => {
    let owned = claimable;
    if (claimable) {
      const [result] = await conn.execute(
        `UPDATE issues
           SET assigned_officer_id = ?, last_activity_at = NOW()
         WHERE id = ? AND department_id = ?
           AND status IN ('SUBMITTED','UNDER_REVIEW','REOPENED')
           AND (assigned_officer_id IS NULL OR assigned_officer_id = ?)`,
        [officerId, issueId, issue.department_id, officerId],
      );
      if (result.affectedRows === 0) {
        const [rows] = await conn.execute(
          'SELECT assigned_officer_id, status FROM issues WHERE id = ?',
          [issueId],
        );
        const current = rows[0];
        if (current && current.assigned_officer_id && String(current.assigned_officer_id) !== String(officerId)) {
          throw new AppError(409, 'Issue has already been accepted by another officer.');
        }
        if (current && ['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(current.status)) {
          throw new AppError(422, `Cannot accept an issue in ${current.status} state`);
        }
        throw new AppError(409, 'Issue was claimed by another officer first.');
      }
    } else {
      // Officer is continuing work on an issue already assigned to them.
      owned = String(issue.assigned_officer_id) === String(officerId);
    }

    await insertAssignment(
      { issueId, departmentId: issue.department_id, officerId, assignedBy: officerId },
      conn,
    );

    if (claimable) {
      // Preserve the original ASSIGNED -> IN_PROGRESS timeline entries.
      const base = { issueId, changedBy: officerId };
      await addStatusHistory({ ...base, fromStatus: issue.status, toStatus: 'ASSIGNED', note: 'Officer accepted and claimed this issue', conn });
      await addStatusHistory({ ...base, fromStatus: 'ASSIGNED', toStatus: 'IN_PROGRESS', note: 'Officer started work on this issue', conn });
      await updateIssue(issueId, { status: 'IN_PROGRESS', lastActivityAt: new Date() }, conn);
    } else if (issue.status !== 'IN_PROGRESS') {
      await addStatusHistory({ issueId, fromStatus: issue.status, toStatus: 'IN_PROGRESS', changedBy: officerId, note: 'Officer started work on this issue', conn });
      await updateIssue(issueId, { status: 'IN_PROGRESS', lastActivityAt: new Date() }, conn);
    }

    return { owned };
  });

  if (finalStatus !== issue.status || claimed.owned === false) {
    await sendStatusNotifications({
      issueId,
      issue,
      toStatus: 'IN_PROGRESS',
      fromStatus: issue.status,
      note: claimable ? 'Officer accepted and is working on this issue' : 'Officer started work on this issue',
      actorName,
    });
  }
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: issue.status, to: finalStatus, note: 'Accepted',
  });

  return { from: issue.status, to: finalStatus };
}

export async function resolveIssueWithEvidence({ issueId, officerId, note, evidenceFiles, req }) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');
  const roleNames = (req?.user?.roles || []).map((role) => role.name);
  if (!roleNames.includes('ADMIN')) {
    if (String(issue.department_id) !== String(req?.user?.departmentId)) {
      throw new AppError(403, 'You can only resolve issues in your department');
    }
    if (String(issue.assigned_officer_id) !== String(officerId)) {
      throw new AppError(403, 'Only the assigned officer can resolve this issue');
    }
  }
  if (issue.status !== 'IN_PROGRESS') {
    throw new AppError(422, 'Issue must be IN_PROGRESS before it can be resolved');
  }

  if (!note?.trim()) throw new AppError(422, 'Resolution note is required');
  if (!evidenceFiles?.length) throw new AppError(422, 'Completion evidence image is required');

  // Resolve is transactional: resolution record + status + status history.
  const resolutionId = await transaction(async (conn) => {
    const id = await createResolution(
      { issueId, officerId, note, imagePath: storedUploadPath(evidenceFiles[0].path) },
      conn,
    );
    await writeStatusChange(conn, {
      issueId,
      fromStatus: 'IN_PROGRESS',
      toStatus: 'RESOLVED',
      changedBy: officerId,
      note,
    });
    return id;
  });

  await notifier.notifyIssueFollowers(
    issueId,
    {
      type: 'ISSUE_RESOLVED',
      title: 'Issue resolved',
      body: `${issue.title} has been marked resolved. Please verify it.`,
      link: `/issue/${issueId}`,
      payload: { issueId, resolutionId },
    },
    { excludeUserId: officerId },
  );

  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: 'IN_PROGRESS', to: 'RESOLVED', note,
  });

  return { resolutionId };
}

export async function verifyResolution({ issueId, viewerId, confirmed }) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');
  if (issue.status !== 'RESOLVED') {
    throw new AppError(422, 'Issue is not currently in RESOLVED state');
  }

  // The whole decision is made under a single transaction with a row lock on the
  // resolution, so simultaneous "still unresolved" votes cannot reopen twice.
  const outcome = await transaction(async (conn) => {
    const [resolutionRows] = await conn.execute(
      `SELECT * FROM issue_resolutions WHERE issue_id = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [issueId],
    );
    const resolution = resolutionRows[0];
    if (!resolution) {
      throw new AppError(404, 'No resolution record found');
    }

    await confirmResolution({ conn, issueId, resolutionId: resolution.id, userId: viewerId, confirmed });

    const [counts] = await conn.execute(
      `SELECT confirmed_count, reopened_count FROM issue_resolutions WHERE id = ?`,
      [resolution.id],
    );
    const c = counts[0];

    // Reopen when several citizens report it is still unresolved.
    const unresolvedThreshold = 2;
    const reopen =
      (c.reopened_count >= unresolvedThreshold && c.reopened_count > c.confirmed_count);

    if (!confirmed && reopen) {
      const [issueRows] = await conn.execute(
        `SELECT status FROM issues WHERE id = ? FOR UPDATE`,
        [issueId],
      );
      if (issueRows[0] && issueRows[0].status === 'RESOLVED') {
        await writeStatusChange(conn, {
          issueId,
          fromStatus: 'RESOLVED',
          toStatus: 'REOPENED',
          changedBy: null,
          note: 'Multiple citizens reported the issue is still unresolved',
        });
        return { reopened: true, reopenedCount: c.reopened_count };
      }
    }
    return { reopened: false, confirmedCount: c.confirmed_count, reopenedCount: c.reopened_count };
  });

  const pool = await import('../config/database.js').then((m) => m.default);
  await pool.execute('UPDATE users SET points = points + ? WHERE id = ?', [PTS_VERIFICATION, viewerId]);

  if (outcome.reopened) {
    await sendStatusNotifications({
      issueId,
      issue,
      toStatus: 'REOPENED',
      fromStatus: 'RESOLVED',
      note: 'Multiple citizens reported the issue is still unresolved',
      actorName: 'SYSTEM',
    });
    await notifier.emitIssueUpdate(issueId, 'issue:status', {
      issueId, from: 'RESOLVED', to: 'REOPENED',
    });
    return { confirmed, reopened: true, reopenedCount: outcome.reopenedCount };
  }

  return {
    confirmed,
    reopened: false,
    confirmedCount: outcome.confirmedCount ?? 0,
    reopenedCount: outcome.reopenedCount ?? 0,
  };
}

async function sendStatusNotifications({ issueId, issue, toStatus, fromStatus, note, actorName }) {
  const labels = { ASSIGNED: 'Assigned', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', CLOSED: 'Closed', REOPENED: 'Reopened', REJECTED: 'Rejected', DUPLICATE: 'Marked duplicate' };
  const toLabel = labels[toStatus] || toStatus;
  const title = `Status updated to ${toLabel}`;
  const body = note || `${issue.title}: ${fromStatus} → ${toLabel}.`;

  await notifier.notifyIssueFollowers(
    issueId,
    { type: toStatus === 'REOPENED' ? 'ISSUE_REOPENED' : 'STATUS_CHANGED', title, body, link: `/issue/${issueId}`, payload: { issueId, fromStatus, toStatus } },
    { excludeUserId: actorName === 'SYSTEM' ? null : issue.reporter_id },
  );
  if (actorName !== 'SYSTEM') {
    await notifier.notify(issue.reporter_id, {
      type: 'STATUS_CHANGED',
      title,
      body,
      link: `/issue/${issueId}`,
      payload: { issueId, fromStatus, toStatus },
    });
  }
}

export async function assignIssueOfficerToIssue({ issueId, officerId, assignedBy, req }) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');
  if (['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(issue.status)) {
    throw new AppError(422, `Cannot assign an issue in ${issue.status} state`);
  }

  const officerRows = await query(
    `SELECT ur.user_id, ur.department_id FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = 'OFFICER'`,
    [officerId],
  );
  if (!officerRows.length) throw new AppError(404, 'Officer not found');
  const officerDept = officerRows[0].department_id;

  // Atomic assignment: one officer owns the issue at a time.
  const assigned = await transaction(async (conn) => {
    const [result] = await conn.execute(
      `UPDATE issues
         SET assigned_officer_id = ?, department_id = ?, status = 'ASSIGNED', last_activity_at = NOW()
       WHERE id = ?`,
      [officerId, officerDept, issueId],
    );
    if (result.affectedRows === 0) throw new AppError(404, 'Issue not found');

    await insertAssignment({ issueId, departmentId: officerDept, officerId, assignedBy }, conn);
    await addStatusHistory({
      issueId,
      fromStatus: issue.status,
      toStatus: 'ASSIGNED',
      changedBy: assignedBy,
      note: `Assigned to officer #${officerId}`,
      conn,
    });
    return { officerDept };
  });

  await notifier.notify(officerId, {
    type: 'ISSUE_ASSIGNED',
    title: 'Issue assigned to you',
    body: `${issue.title} has been assigned to you.`,
    link: `/issue/${issueId}`,
    payload: { issueId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: issue.status, to: 'ASSIGNED', officerId, action: 'assigned',
  });

  return { officerId, departmentId: assigned.officerDept };
}

export { PTS_VALID_ISSUE, PTS_ISSUE_RESOLVED, PTS_VERIFICATION, PTS_DUPLICATE_AVOIDED };
