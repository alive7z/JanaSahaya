import AppError from '../utils/AppError.js';
import * as commentRepo from '../repositories/comment.repository.js';
import { getIssue } from '../repositories/issue.repository.js';
import { emitToIssue } from '../sockets/emitter.js';
import * as notifier from './notification.service.js';

async function issueExists(issueId) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');
  return issue;
}

export async function addComment({ issueId, userId, content, parentId }) {
  const issue = await issueExists(issueId);
  const comment = await commentRepo.addComment(issueId, userId, content, parentId);

  emitToIssue(issueId, 'issue:comment', { issueId, comment });
  if (userId !== issue.reporter_id) {
    await notifier.notify(issue.reporter_id, {
      type: 'COMMENT_RECEIVED',
      title: 'New comment on your issue',
      body: `${comment.author_name} commented on "${issue.title}"`,
      link: `/issue/${issueId}`,
      payload: { issueId },
    });
  }
  return comment;
}

export async function editComment({ commentId, userId, content }) {
  const comment = await commentRepo.getComment(commentId);
  if (!comment) throw new AppError(404, 'Comment not found');
  if (comment.user_id !== userId) throw new AppError(403, 'You can only edit your own comments');

  await commentRepo.updateComment(commentId, content);
  const updated = await commentRepo.getComment(commentId);
  return updated;
}

export async function deleteComment({ commentId, userId }) {
  const comment = await commentRepo.getComment(commentId);
  if (!comment) throw new AppError(404, 'Comment not found');
  if (comment.user_id !== userId) throw new AppError(403, 'You can only delete your own comments');

  await commentRepo.deleteComment(commentId);
  emitToIssue(comment.issue_id, 'issue:comment-removed', { issueId: comment.issue_id, commentId });
}

export async function reportContent({ reporterId, contentType, contentId, reason }) {
  if (!reason?.trim()) throw new AppError(422, 'Reason is required');
  return commentRepo.reportContent({ reporterId, contentType, contentId, reason });
}

export async function listForIssue(issueId) {
  return commentRepo.listComments(issueId);
}