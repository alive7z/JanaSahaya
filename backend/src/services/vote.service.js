import AppError from '../utils/AppError.js';
import * as voteRepo from '../repositories/vote.repository.js';
import { getIssue } from '../repositories/issue.repository.js';
import { emitToIssue } from '../sockets/emitter.js';
import * as notifier from './notification.service.js';

export async function vote(issueId, userId) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');

  if (issue.status === 'DUPLICATE') {
    throw new AppError(422, 'You cannot vote on a duplicate issue');
  }

  const result = await voteRepo.addVote(issueId, userId);
  const count = await voteRepo.countVotes(issueId);

  emitToIssue(issueId, 'issue:vote', {
    issueId,
    voteCount: count[0]?.n ?? 0,
    action: 'add',
  });

  if (result.inserted) {
    await notifier.notify(issue.reporter_id, {
      type: 'COMMENT_RECEIVED',
      title: 'New support for your issue',
      body: `${issue.title} received a new supporter (${count[0]?.n ?? 0} total).`,
      link: `/issue/${issueId}`,
      payload: { issueId },
    });
  }

  return { inserted: result.inserted, voteCount: count[0]?.n ?? 0 };
}

export async function removeVote(issueId, userId) {
  await voteRepo.removeVote(issueId, userId);
  const count = await voteRepo.countVotes(issueId);
  emitToIssue(issueId, 'issue:vote', {
    issueId,
    voteCount: count[0]?.n ?? 0,
    action: 'remove',
  });
  return { voteCount: count[0]?.n ?? 0 };
}