import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { authenticate, blockDemoAdminMutation, requireRole, restrictDemoAdminToDemoIssues } from '../middleware/auth.middleware.js';
import { listQueryValidator, idParamValidator } from '../validators/issue.validators.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/issues', admin.adminIssueList);
router.get('/map', admin.adminMap);
router.get('/issues/:id', admin.adminIssueDetail);
router.post('/issues/:id/reassign', restrictDemoAdminToDemoIssues, admin.reassignIssue);
router.post('/issues/:id/status', restrictDemoAdminToDemoIssues, admin.adminStatusChange);

router.get('/users', listQueryValidator, admin.users);
router.get('/users/:id', admin.userDetail);
router.patch('/users/:id', blockDemoAdminMutation, admin.updateUser);
router.post('/users/:id/roles', blockDemoAdminMutation, admin.assignUserRole);
router.patch('/users/:id/ban', blockDemoAdminMutation, admin.toggleBan);

router.get('/officers', admin.officersList);
router.post('/officers', blockDemoAdminMutation, admin.createOfficer);

router.get('/departments', admin.departments);
router.post('/departments', blockDemoAdminMutation, admin.createDept);
router.get('/departments/:id', admin.departmentDetail);
router.patch('/departments/:id', blockDemoAdminMutation, admin.updateDept);

router.get('/categories', admin.categoriesAdmin);
router.post('/categories', blockDemoAdminMutation, admin.createCategory);
router.patch('/categories/:id', blockDemoAdminMutation, admin.updateCategory);
router.patch('/categories/:id/routing', blockDemoAdminMutation, admin.categoryRouting);

router.get('/sla', admin.slaRules);
router.get('/sla/status', admin.slaStatus);
router.patch('/sla/:id', blockDemoAdminMutation, admin.updateSlaRule);

router.get('/moderation/reports', admin.moderation);
router.post('/moderation/reports/:reportId', blockDemoAdminMutation, admin.moderateComment);
router.post('/moderation/reports/:reportId/moderate', blockDemoAdminMutation, admin.moderateIssueReport);

router.get('/escalations', admin.escalationsAdmin);
router.post('/escalations/:escalationId/acknowledge', blockDemoAdminMutation, admin.acknowledgeEscalation);

router.get('/users/:id/abuse-signals', admin.abuseSignalsForUser);
router.get('/users/:id/issues', idParamValidator, admin.issuesForUserAdmin);

router.get('/audit-logs', admin.auditLogs);

export default router;
