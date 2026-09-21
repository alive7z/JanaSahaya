import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import AppError from '../utils/AppError.js';
import * as issueService from '../services/issue.service.js';
import * as voteService from '../services/vote.service.js';
import * as commentService from '../services/comment.service.js';
import * as followService from '../services/follow.service.js';
import { getIssueDetail as detailService } from '../services/issue.service.js';
import { getNearbyForMap } from '../services/map.service.js';
import { withAudit } from '../repositories/audit.repository.js';

export const create = asyncHandler(async (req, res) => {
  const result = await issueService.createNewIssue({
    input: req.body,
    userId: req.user.id,
    files: req.files ?? {},
  });
  success(res, 201, 'Issue submitted successfully', result);
});

export const checkDuplicates = asyncHandler(async (req, res) => {
  const result = await issueService.checkDuplicates(req.body);
  success(res, 200, 'Duplicate check complete', result);
});

export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sort = 'newest', search, status, category_id, department_id, priority, ward, city, reporter_id, distance, lat, lng } = req.query;

  const filters = {
    page: Math.max(parseInt(page, 10) || 1, 1),
    limit: Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100),
    sort,
    search: search || null,
    statusFilters: status ? String(status).split(',') : null,
    categoryId: category_id || null,
    departmentId: department_id || null,
    priority: priority || null,
    ward: ward || null,
    city: city || null,
    reporterId: reporter_id || null,
    onlyVotedBy: req.query.voted_by,
    onlyFollowedBy: req.query.followed_by,
    departmentFilter: req.departmentFilter ?? null,
  };

  let near = null;
  if (distance && lat && lng) {
    const radius = { 500: 500, 1000: 1000, 2000: 2000, 5000: 5000 }[parseInt(distance, 10)];
    if (!radius) throw new AppError(422, 'distance must be one of 500, 1000, 2000, 5000');
    near = { lat: parseFloat(lat), lng: parseFloat(lng), radiusMetres: radius };
  }

  const result = await issueService.listIssuesWithFilters({ ...filters, near, user: req.user });
  const issues =
    near && req.user
      ? await attachDistances(result.issues, near)
      : result.issues;

  success(res, 200, 'Issues fetched', { ...result, issues });
});

async function attachDistances(issues, near) {
  const { distanceInMeters } = await import('../utils/haversine.js');
  return issues.map((i) => ({
    ...i,
    distance_metres: distanceInMeters(near.lat, near.lng, i.latitude, i.longitude),
  }));
}

export const detail = asyncHandler(async (req, res) => {
  const data = await detailService(req.params.id, req.user?.id ?? null);
  success(res, 200, 'Issue fetched', data);
});

export const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, distance = 1000 } = req.query;
  if (!lat || !lng) throw new AppError(422, 'lat and lng are required');
  const result = await getNearbyForMap({
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    radius: parseInt(distance, 10) || 1000,
  });
  success(res, 200, 'Nearby issues fetched', result);
});

export const vote = asyncHandler(async (req, res) => {
  const result = await voteService.vote(req.params.id, req.user.id);
  success(res, 200, result.inserted ? 'Issue supported' : 'Vote already present', result);
});

export const removeVote = asyncHandler(async (req, res) => {
  const result = await voteService.removeVote(req.params.id, req.user.id);
  success(res, 200, 'Vote removed', result);
});

export const addComment = asyncHandler(async (req, res) => {
  const comment = await commentService.addComment({
    issueId: req.params.id,
    userId: req.user.id,
    content: req.body.content,
    parentId: req.body.parent_id ?? null,
  });
  success(res, 201, 'Comment added', comment);
});

export const editComment = asyncHandler(async (req, res) => {
  const comment = await commentService.editComment({ commentId: req.params.commentId, userId: req.user.id, content: req.body.content });
  success(res, 200, 'Comment updated', comment);
});

export const deleteComment = asyncHandler(async (req, res) => {
  await commentService.deleteComment({ commentId: req.params.commentId, userId: req.user.id });
  success(res, 200, 'Comment deleted');
});

export const reportComment = asyncHandler(async (req, res) => {
  const id = await commentService.reportContent({
    reporterId: req.user.id,
    contentType: req.body.content_type || 'COMMENT',
    contentId: req.params.commentId,
    reason: req.body.reason,
  });
  success(res, 201, 'Report submitted', { reportId: id });
});

export const reportIssue = asyncHandler(async (req, res) => {
  const issue = await issueService.getIssueDetail(req.params.id, null);
  if (!issue.issue) throw new AppError(404, 'Issue not found');
  if (issue.issue.deleted_at) throw new AppError(409, 'Issue is archived');
  const id = await commentService.reportContent({
    reporterId: req.user.id,
    contentType: req.body.content_type || 'issue',
    contentId: req.params.id,
    reason: req.body.reason,
  });
  const notifier = await import('../services/notification.service.js');
  await notifier.notifyAdmins({
    type: 'CONTENT_MODERATION',
    title: 'Issue reported',
    body: `Issue #${req.params.id} was reported: ${req.body.reason}`,
    link: `/admin/issues/${req.params.id}`,
    payload: { issueId: req.params.id, reportId: id },
  });
  success(res, 201, 'Report submitted', { reportId: id });
});

export const follow = asyncHandler(async (req, res) => {
  const result = await followService.follow(req.params.id, req.user.id);
  success(res, 200, result.added ? 'Following issue' : 'Already following', result);
});

export const unfollow = asyncHandler(async (req, res) => {
  const result = await followService.unfollow(req.params.id, req.user.id);
  success(res, 200, result.removed ? 'Unfollowed' : 'Not following', result);
});

export const changeStatus = asyncHandler(async (req, res) => {
  const result = await withAudit({
    req,
    action: 'ISSUE_STATUS_CHANGE',
    resourceType: 'issue',
    resourceId: req.params.id,
    oldValue: { status: req.issue?.status },
    newValue: { status: req.body.status },
    work: async () =>
      issueService.changeStatus({
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

export const officerResolve = asyncHandler(async (req, res) => {
  const result = await issueService.resolveIssueWithEvidence({
    issueId: req.params.id,
    officerId: req.user.id,
    note: req.body.note,
    evidenceFiles: req.files?.evidence ?? [],
  });
  success(res, 200, 'Issue marked resolved', result);
});

export const officerAccept = asyncHandler(async (req, res) => {
  const result = await withAudit({
    req,
    action: 'ISSUE_ACCEPTED',
    resourceType: 'issue',
    resourceId: req.params.id,
    newValue: { status: 'IN_PROGRESS', officerId: req.user.id },
    work: async () =>
      issueService.acceptByOfficer({
        issueId: req.params.id,
        officerId: req.user.id,
        req,
      }),
  });
  success(res, 200, 'Issue accepted', result);
});

export const verifyResolution = asyncHandler(async (req, res) => {
  const result = await issueService.verifyResolution({
    issueId: req.params.id,
    viewerId: req.user.id,
    confirmed: Boolean(req.body.confirmed),
  });
  success(res, 200, result.reopened ? 'Issue reopened due to verification' : 'Verification recorded', result);
});

export const assignOfficer = asyncHandler(async (req, res) => {
  const result = await withAudit({
    req,
    action: 'ISSUE_ASSIGN_OFFICER',
    resourceType: 'issue',
    resourceId: req.params.id,
    newValue: { officerId: req.body.officer_id },
    work: async () =>
      issueService.assignIssueOfficerToIssue({
        issueId: req.params.id,
        officerId: req.body.officer_id,
        assignedBy: req.user.id,
        req,
      }),
  });
  success(res, 200, 'Officer assigned', result);
});

export const myIssues = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, tab = 'reported' } = req.query;
  const filters = {
    page,
    limit,
    sort: 'newest',
    user: req.user,
    departmentFilter: null,
  };
  if (tab === 'reported') filters.reporterId = req.user.id;
  if (tab === 'voted') filters.onlyVotedBy = true;
  if (tab === 'following') filters.onlyFollowedBy = true;
  const result = await issueService.listIssuesWithFilters(filters);
  success(res, 200, 'Issues fetched', result);
});

export const listComments = asyncHandler(async (req, res) => {
  const comments = await commentService.listForIssue(req.params.id);
  success(res, 200, 'Comments fetched', { comments });
});