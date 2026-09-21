import { Router } from 'express';
import * as issue from '../controllers/issue.controller.js';
import { authenticate, optionalAuthenticate, requireRole, requireOfficerOfDepartment, restrictDemoAdminToDemoIssues } from '../middleware/auth.middleware.js';
import { issueImages } from '../middleware/upload.middleware.js';
import { reportLimiter, commentLimiter, interactionLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  createIssueValidator,
  duplicateCheckValidator,
  idParamValidator,
  commentValidator,
  statusValidator,
  resolveValidator,
  verifyValidator,
  assignOfficerValidator,
  listQueryValidator,
  reportValidator,
} from '../validators/issue.validators.js';

const router = Router();

// Public
router.get('/', listQueryValidator, issue.list);
router.get('/nearby', issue.nearby);
router.get('/map', issue.map);
router.post('/check-duplicates', authenticate, duplicateCheckValidator, issue.checkDuplicates);

// Authenticated "my issues" lists (must precede /:id)
router.get('/my', authenticate, issue.myIssues);

router.get('/:id', optionalAuthenticate, idParamValidator, issue.detail);

// Citizen reporting (duplicate/spam/misinformation)
router.post('/:id/report', authenticate, reportLimiter(), idParamValidator, reportValidator, issue.reportIssue);

// Auth required
router.post('/', authenticate, reportLimiter(), issueImages, createIssueValidator, issue.create);

// Citizen / officer interactions
router.post('/:id/vote', authenticate, interactionLimiter(), idParamValidator, issue.vote);
router.delete('/:id/vote', authenticate, interactionLimiter(), idParamValidator, issue.removeVote);
router.post('/:id/follow', authenticate, interactionLimiter(), idParamValidator, issue.follow);
router.delete('/:id/follow', authenticate, interactionLimiter(), idParamValidator, issue.unfollow);
router.post('/:id/verify', authenticate, interactionLimiter(), verifyValidator, issue.verifyResolution);

// Comments
router.get('/:id/comments', idParamValidator, issue.listComments);
router.post('/:id/comments', authenticate, commentLimiter(), commentValidator, issue.addComment);
router.patch('/:id/comments/:commentId', authenticate, commentLimiter(), issue.editComment);
router.delete('/:id/comments/:commentId', authenticate, issue.deleteComment);
router.post('/:id/comments/:commentId/report', authenticate, commentLimiter(), reportValidator, issue.reportComment);

// Officer actions
router.patch(
  '/:id/accept',
  authenticate,
  requireOfficerOfDepartment,
  idParamValidator,
  restrictDemoAdminToDemoIssues,
  issue.officerAccept,
);
router.patch(
  '/:id/status',
  authenticate,
  requireRole('OFFICER', 'ADMIN'),
  statusValidator,
  restrictDemoAdminToDemoIssues,
  issue.changeStatus,
);
router.post(
  '/:id/resolve',
  authenticate,
  requireRole('OFFICER', 'ADMIN'),
  requireOfficerOfDepartment,
  restrictDemoAdminToDemoIssues,
  issueImages,
  resolveValidator,
  issue.officerResolve,
);

// Admin actions
router.patch(
  '/:id/assign-officer',
  authenticate,
  requireRole('ADMIN'),
  assignOfficerValidator,
  restrictDemoAdminToDemoIssues,
  issue.assignOfficer,
);

export default router;
