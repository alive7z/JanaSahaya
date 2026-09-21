import AppError from '../utils/AppError.js';
import { transaction } from '../config/database.js';
import { validateTransition } from './status.service.js';
import {
  updateIssue,
  addStatusHistory,
  insertAssignment,
  createResolution,
} from '../repositories/issue.repository.js';
import { insertAuditOnConn } from '../repositories/audit.repository.js';
import * as notifier from './notification.service.js';
import { PTS_DUPLICATE_AVOIDED } from './issue.service.js';

async function loadLockedIssue(conn, issueId) {
  const [rows] = await conn.execute('SELECT * FROM issues WHERE id = ? FOR UPDATE', [issueId]);
  if (!rows[0]) throw new AppError(404, 'Issue not found');
  return rows[0];
}

function assertActive(issue) {
  if (issue.deleted_at) {
    throw new AppError(409, 'Issue is archived');
  }
}

/** Add a timeline note without changing status. */
function timelineNote(conn, { issueId, status, changedBy, note }) {
  return addStatusHistory({ issueId, fromStatus: status, toStatus: status, changedBy, note, conn });
}

function audit(conn, { req, action, resourceId, oldValue, newValue }) {
  return insertAuditOnConn(conn, {
    req,
    action,
    resourceType: 'issue',
    resourceId,
    oldValue,
    newValue,
  });
}

/** Admin acknowledges an issue (record for accountability). Idempotent-ish: rejects double-ack. */
export async function acknowledgeIssue({ issueId, actorId, req, note }) {
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    if (issue.acknowledged_at) {
      throw new AppError(409, 'Issue has already been acknowledged');
    }
    await updateIssue(issueId, {
      acknowledgedBy: actorId,
      acknowledgedAt: new Date(),
      lastActivityAt: new Date(),
    }, conn);
    await timelineNote(conn, {
      issueId,
      status: issue.status,
      changedBy: actorId,
      note: note || 'Issue acknowledged by admin',
    });
    await audit(conn, {
      req,
      action: 'ISSUE_ACKNOWLEDGE',
      resourceId: issueId,
      oldValue: { acknowledged_at: null, status: issue.status },
      newValue: { acknowledged_by: actorId, note },
    });
    result = { issueId, status: issue.status };
  });

  await notifier.notifyIssueFollowers(issueId, {
    type: 'ISSUE_ACKNOWLEDGED',
    title: 'Issue acknowledged',
    body: note || 'This issue has been acknowledged by our team',
    link: `/issue/${issueId}`,
    payload: { issueId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:update', { issueId, action: 'acknowledge' });
  return result;
}

/** Admin verifies an issue and records a verification note. */
export async function verifyIssue({ issueId, actorId, req, note }) {
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    if (!['PENDING', 'UNVERIFIED'].includes(issue.verification_status)) {
      throw new AppError(422, `Issue is already ${issue.verification_status}`);
    }
    await updateIssue(issueId, {
      verificationStatus: 'VERIFIED',
      verifiedBy: actorId,
      verifiedAt: new Date(),
      verificationNote: note || null,
      lastActivityAt: new Date(),
    }, conn);
    await timelineNote(conn, {
      issueId,
      status: issue.status,
      changedBy: actorId,
      note: note ? `Verified: ${note}` : 'Issue verified by admin',
    });
    await audit(conn, {
      req,
      action: 'ISSUE_VERIFY',
      resourceId: issueId,
      oldValue: { verification_status: issue.verification_status, status: issue.status },
      newValue: { verification_status: 'VERIFIED', note },
    });
    result = { issueId, status: issue.status };
  });

  await notifier.notifyIssueFollowers(issueId, {
    type: 'ISSUE_VERIFIED',
    title: 'Issue verified',
    body: note || 'Your reported issue has been verified',
    link: `/issue/${issueId}`,
    payload: { issueId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:update', { issueId, action: 'verify' });
  return result;
}

/** Admin rejects an issue as invalid. Requires a rejection reason. */
export async function rejectIssue({ issueId, actorId, req, reason }) {
  if (!reason?.trim()) throw new AppError(422, 'Rejection reason is required');
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    validateTransition({ from: issue.status, to: 'REJECTED', actor: 'ADMIN' });
    await updateIssue(issueId, {
      status: 'REJECTED',
      rejectionReason: reason.trim(),
      lastActivityAt: new Date(),
    }, conn);
    await addStatusHistory({
      issueId,
      fromStatus: issue.status,
      toStatus: 'REJECTED',
      changedBy: actorId,
      note: reason.trim(),
      conn,
    });
    await audit(conn, {
      req,
      action: 'ISSUE_REJECT',
      resourceId: issueId,
      oldValue: { status: issue.status },
      newValue: { status: 'REJECTED', reason: reason.trim() },
    });
    result = { issueId, reporterId: issue.reporter_id, from: issue.status, to: 'REJECTED' };
  });

  await notifier.notify(result.reporterId, {
    type: 'ISSUE_REJECTED',
    title: 'Issue rejected',
    body: `Your issue was rejected: ${reason.trim()}`,
    link: `/issue/${issueId}`,
    payload: { issueId, reason: reason.trim() },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, action: 'reject', reason: reason.trim(),
  });
  return result;
}

/** Admin (re)assigns an issue to a department. */
export async function assignDepartment({ issueId, actorId, req, departmentId, note }) {
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    const deptRows = await conn.execute(
      'SELECT id, name FROM departments WHERE id = ?',
      [departmentId],
    );
    if (!deptRows[0]) throw new AppError(404, 'Department not found');
    const deptName = deptRows[0][0]?.name;
    if (issue.department_id && String(issue.department_id) === String(departmentId)) {
      throw new AppError(409, 'Issue is already assigned to this department');
    }
    const updates = { departmentId, lastActivityAt: new Date() };
    if (issue.assigned_officer_id) {
      const [officerDept] = await conn.execute(
        `SELECT ur.department_id FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ? AND r.name = 'OFFICER' AND ur.department_id = ?
         LIMIT 1`,
        [issue.assigned_officer_id, departmentId],
      );
      if (!officerDept.length) updates.assignedOfficerId = null;
    }
    await updateIssue(issueId, updates, conn);
    await insertAssignment({ issueId, departmentId, officerId: null, assignedBy: actorId }, conn);
    await timelineNote(conn, {
      issueId,
      status: issue.status,
      changedBy: actorId,
      note: note || `Reassigned to ${deptName || 'new'} department`,
    });
    await audit(conn, {
      req,
      action: 'ISSUE_ASSIGN_DEPT',
      resourceId: issueId,
      oldValue: { department_id: issue.department_id, assigned_officer_id: issue.assigned_officer_id },
      newValue: { department_id: departmentId, note },
    });
    result = { issueId, departmentId, departmentName: deptName || null };
  });

  if (result.departmentId) {
    await notifier.notifyDepartmentOfficers(result.departmentId, {
      type: 'ISSUE_ASSIGNED',
      title: 'Issue routed to your department',
      body: `Issue #${issueId} has been assigned to your department`,
      link: `/issue/${issueId}`,
      payload: { issueId },
    });
  }
  await notifier.emitIssueUpdate(issueId, 'issue:update', { issueId, action: 'assignDepartment' });
  return result;
}

/** Admin directly resolves an issue (IN_PROGRESS / REOPENED) with a note and optional evidence. */
export async function adminResolve({ issueId, actorId, req, note, evidencePath = null }) {
  if (!note?.trim()) throw new AppError(422, 'Resolution note is required');
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    if (!['IN_PROGRESS', 'REOPENED'].includes(issue.status)) {
      throw new AppError(422, `Issue must be IN_PROGRESS to be resolved by admin (got ${issue.status})`);
    }
    const resolutionId = await createResolution({
      issueId,
      officerId: issue.assigned_officer_id || actorId,
      note: note.trim(),
      imagePath: evidencePath,
    }, conn);
    await updateIssue(issueId, {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      lastActivityAt: new Date(),
    }, conn);
    await addStatusHistory({
      issueId,
      fromStatus: issue.status,
      toStatus: 'RESOLVED',
      changedBy: actorId,
      note: note.trim(),
      conn,
    });
    await conn.execute(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [PTS_ISSUE_RESOLVED, issue.reporter_id],
    );
    await audit(conn, {
      req,
      action: 'ISSUE_ADMIN_RESOLVE',
      resourceId: issueId,
      oldValue: { status: issue.status },
      newValue: { status: 'RESOLVED', resolution_id: resolutionId, note: note.trim() },
    });
    result = { issueId, resolutionId, status: 'RESOLVED', from: issue.status };
  });

  await notifier.notifyIssueFollowers(issueId, {
    type: 'ISSUE_RESOLVED',
    title: 'Issue resolved',
    body: `${note.trim()}`,
    link: `/issue/${issueId}`,
    payload: { issueId, resolutionId: result.resolutionId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: result.from, to: 'RESOLVED', note: note.trim(),
  });
  return result;
}

/** Admin closes a resolved issue. */
export async function closeIssue({ issueId, actorId, req, note }) {
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    validateTransition({ from: issue.status, to: 'CLOSED', actor: 'ADMIN' });
    await updateIssue(issueId, {
      status: 'CLOSED',
      closedAt: new Date(),
      lastActivityAt: new Date(),
    }, conn);
    await addStatusHistory({
      issueId,
      fromStatus: issue.status,
      toStatus: 'CLOSED',
      changedBy: actorId,
      note: note || 'Issue closed',
      conn,
    });
    await audit(conn, {
      req,
      action: 'ISSUE_CLOSE',
      resourceId: issueId,
      oldValue: { status: issue.status },
      newValue: { status: 'CLOSED', note },
    });
    result = { issueId, from: issue.status, to: 'CLOSED' };
  });

  await notifier.notifyIssueFollowers(issueId, {
    type: 'STATUS_CHANGED',
    title: 'Issue closed',
    body: note || 'This issue has been closed',
    link: `/issue/${issueId}`,
    payload: { issueId, fromStatus: result.from, toStatus: 'CLOSED' },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: result.from, to: 'CLOSED', note,
  });
  return result;
}

/** Admin reopens a CLOSED / REJECTED / DUPLICATE issue. Requires a reason. */
export async function reopenIssue({ issueId, actorId, req, reason }) {
  if (!reason?.trim()) throw new AppError(422, 'Reopen reason is required');
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    validateTransition({ from: issue.status, to: 'REOPENED', actor: 'ADMIN' });
    const updates = { status: 'REOPENED', lastActivityAt: new Date() };
    if (issue.status === 'DUPLICATE') updates.duplicateOfId = null;
    await updateIssue(issueId, updates, conn);
    await addStatusHistory({
      issueId,
      fromStatus: issue.status,
      toStatus: 'REOPENED',
      changedBy: actorId,
      note: reason.trim(),
      conn,
    });
    await audit(conn, {
      req,
      action: 'ISSUE_REOPEN',
      resourceId: issueId,
      oldValue: { status: issue.status },
      newValue: { status: 'REOPENED', reason: reason.trim() },
    });
    result = { issueId, from: issue.status, to: 'REOPENED' };
  });

  await notifier.notifyIssueFollowers(issueId, {
    type: 'ISSUE_REOPENED',
    title: 'Issue reopened',
    body: reason.trim(),
    link: `/issue/${issueId}`,
    payload: { issueId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, from: result.from, to: 'REOPENED', note: reason.trim(),
  });
  return result;
}

/** Admin marks an issue as a duplicate, optionally merging its votes into the parent. */
export async function markDuplicate({ issueId, actorId, req, duplicateOfId, mergeVotes = false }) {
  if (!duplicateOfId || String(duplicateOfId) === String(issueId)) {
    throw new AppError(422, 'duplicate_of_id must reference another issue');
  }
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    assertActive(issue);
    const [targetRows] = await conn.execute(
      'SELECT id, status, deleted_at, reporter_id FROM issues WHERE id = ? FOR UPDATE',
      [duplicateOfId],
    );
    if (!targetRows[0]) throw new AppError(404, 'Target issue not found');
    if (targetRows[0].deleted_at) throw new AppError(409, 'Target issue is archived');
    if (targetRows[0].status === 'DUPLICATE') {
      throw new AppError(422, 'Target issue is itself a duplicate');
    }
    validateTransition({ from: issue.status, to: 'DUPLICATE', actor: 'ADMIN' });

    if (mergeVotes && !issue.duplicate_of_id && issue.vote_count > 0) {
      await conn.execute(
        'UPDATE issue_votes SET issue_id = ? WHERE issue_id = ?',
        [duplicateOfId, issueId],
      );
      await conn.execute(
        'UPDATE issues SET vote_count = vote_count + ? WHERE id = ?',
        [issue.vote_count, duplicateOfId],
      );
    }

    await updateIssue(issueId, {
      status: 'DUPLICATE',
      duplicateOfId,
      voteCount: mergeVotes ? 0 : issue.vote_count,
      lastActivityAt: new Date(),
    }, conn);
    await addStatusHistory({
      issueId,
      fromStatus: issue.status,
      toStatus: 'DUPLICATE',
      changedBy: actorId,
      note: `Marked as duplicate of issue #${duplicateOfId}${mergeVotes ? ' (votes merged)' : ''}`,
      conn,
    });
    // Requirement: reputation bonus for the first reporter of a unique problem.
    await conn.execute(
      'UPDATE users SET points = points + ? WHERE id = ?',
      [PTS_DUPLICATE_AVOIDED, targetRows[0].reporter_id],
    );
    await audit(conn, {
      req,
      action: 'ISSUE_MARK_DUPLICATE',
      resourceId: issueId,
      oldValue: { status: issue.status, duplicate_of_id: issue.duplicate_of_id },
      newValue: { status: 'DUPLICATE', duplicate_of_id: duplicateOfId, merge_votes: mergeVotes },
    });
    result = { issueId, duplicateOfId, status: 'DUPLICATE' };
  });

  await notifier.notifyIssueFollowers(issueId, {
    type: 'STATUS_CHANGED',
    title: 'Issue marked as duplicate',
    body: `This issue was marked as duplicate of issue #${duplicateOfId}`,
    link: `/issue/${duplicateOfId}`,
    payload: { issueId, duplicateOfId },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:status', {
    issueId, to: 'DUPLICATE', duplicateOfId,
  });
  return result;
}

/** Admin archives (soft-deletes) an issue. Hidden from all normal listings. */
export async function archiveIssue({ issueId, actorId, req, reason }) {
  if (!reason?.trim()) throw new AppError(422, 'Archive reason is required');
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    if (issue.deleted_at) throw new AppError(409, 'Issue is already archived');
    await updateIssue(issueId, {
      deletedAt: new Date(),
      deletedBy: actorId,
      deletionReason: reason.trim(),
      lastActivityAt: new Date(),
    }, conn);
    await timelineNote(conn, {
      issueId,
      status: issue.status,
      changedBy: actorId,
      note: `Archived: ${reason.trim()}`,
    });
    await audit(conn, {
      req,
      action: 'ISSUE_ARCHIVE',
      resourceId: issueId,
      oldValue: { deleted_at: null, status: issue.status },
      newValue: { deleted_at: new Date(), reason: reason.trim() },
    });
    result = { issueId, reporterId: issue.reporter_id, status: issue.status };
  });

  await notifier.notify(result.reporterId, {
    type: 'ISSUE_ARCHIVED',
    title: 'Issue archived',
    body: `Your issue was archived: ${reason.trim()}`,
    link: `/issue/${issueId}`,
    payload: { issueId, reason: reason.trim() },
  });
  await notifier.emitIssueUpdate(issueId, 'issue:update', { issueId, action: 'archive' });
  return result;
}

/** Admin restores an archived issue. */
export async function restoreIssue({ issueId, actorId, req, note }) {
  let result;
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    if (!issue.deleted_at) throw new AppError(409, 'Issue is not archived');
    await updateIssue(issueId, {
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      lastActivityAt: new Date(),
    }, conn);
    await timelineNote(conn, {
      issueId,
      status: issue.status,
      changedBy: actorId,
      note: note ? `Restored: ${note}` : 'Issue restored from archive',
    });
    await audit(conn, {
      req,
      action: 'ISSUE_RESTORE',
      resourceId: issueId,
      oldValue: { deleted_at: issue.deleted_at },
      newValue: { deleted_at: null, note },
    });
    result = { issueId, status: issue.status };
  });

  await notifier.emitIssueUpdate(issueId, 'issue:update', { issueId, action: 'restore' });
  return result;
}

/**
 * Permanently delete an issue. Safety rails mirror requirement: admin-only,
 * requires a deletion reason, and only permitted on an already-archived issue.
 * All dependent rows are removed via ON DELETE CASCADE.
 */
export async function permanentlyDeleteIssue({ issueId, actorId, req, reason }) {
  if (!reason?.trim()) throw new AppError(422, 'Permanent deletion reason is required');
  await transaction(async (conn) => {
    const issue = await loadLockedIssue(conn, issueId);
    if (!issue.deleted_at) {
      throw new AppError(422, 'Archive the issue first, then permanently delete it');
    }
    // Remove references that do not cascade automatically.
    await conn.execute(
      'UPDATE issues SET duplicate_of_id = NULL WHERE duplicate_of_id = ?',
      [issueId],
    );
    await conn.execute('DELETE FROM reports WHERE content_type = ? AND content_id = ?', ['issue', String(issueId)]);
    await conn.execute('DELETE FROM issues WHERE id = ?', [issueId]);
    await audit(conn, {
      req,
      action: 'ISSUE_PERMANENT_DELETE',
      resourceId: issueId,
      oldValue: { status: issue.status, deleted_at: issue.deleted_at },
      newValue: { deleted: true, reason: reason.trim() },
    });
  });
  return { issueId, deleted: true };
}

export async function acknowledgeEscalation({ escalationId, actorId, req }) {
  await transaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT * FROM issue_escalations WHERE id = ? FOR UPDATE',
      [escalationId],
    );
    if (!rows[0]) throw new AppError(404, 'Escalation not found');
    if (rows[0].acknowledged_at) throw new AppError(409, 'Escalation already acknowledged');
    await conn.execute(
      'UPDATE issue_escalations SET acknowledged_by = ?, acknowledged_at = NOW(), status = ? WHERE id = ?',
      [actorId, 'ACKNOWLEDGED', escalationId],
    );
    await insertAuditOnConn(conn, {
      req,
      action: 'ESCALATION_ACKNOWLEDGE',
      resourceType: 'escalation',
      resourceId: escalationId,
      oldValue: { acknowledged_at: null, status: 'OPEN' },
      newValue: { acknowledged_at: new Date(), status: 'ACKNOWLEDGED' },
    });
  });
  return { escalationId, status: 'ACKNOWLEDGED' };
}