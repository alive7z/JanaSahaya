import AppError from '../utils/AppError.js';
import * as followRepo from '../repositories/follow.repository.js';
import { getIssue } from '../repositories/issue.repository.js';

export async function follow(issueId, userId) {
  const issue = await getIssue(issueId);
  if (!issue) throw new AppError(404, 'Issue not found');
  return followRepo.followIssue(issueId, userId);
}

export async function unfollow(issueId, userId) {
  return followRepo.unfollowIssue(issueId, userId);
}