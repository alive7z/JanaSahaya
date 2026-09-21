import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { listQueryValidator, idParamValidator } from '../validators/issue.validators.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/issues', admin.adminIssueList);
router.get('/issues/:id', admin.adminIssueDetail);
router.post('/issues/:id/reassign', admin.reassignIssue);
router.post('/issues/:id/status', admin.adminStatusChange);

router.get('/users', listQueryValidator, admin.users);
router.get('/users/:id', admin.userDetail);
router.patch('/users/:id', admin.updateUser);
router.post('/users/:id/roles', admin.assignUserRole);
router.patch('/users/:id/ban', admin.toggleBan);

router.get('/officers', admin.officersList);
router.post('/officers', admin.createOfficer);

router.get('/departments', admin.departments);
router.post('/departments', admin.createDept);
router.get('/departments/:id', admin.departmentDetail);
router.patch('/departments/:id', admin.updateDept);

router.get('/categories', admin.categoriesAdmin);
router.post('/categories', admin.createCategory);
router.patch('/categories/:id', admin.updateCategory);
router.patch('/categories/:id/routing', admin.categoryRouting);

router.get('/sla', admin.slaRules);
router.get('/sla/status', admin.slaStatus);
router.patch('/sla/:id', admin.updateSlaRule);

router.get('/moderation/reports', admin.moderation);
router.post('/moderation/reports/:reportId', admin.moderateCommentonti);
router.post('/moderation/reports/:reportId/moderate', admin.moderateIssueReport);

router.get('/escalations', admin.escalationsAdmin);
router.post('/escalations/:escalationId/acknowledge', admin.acknowledgeEscalation);

router.get('/users/:id/abuse-signals', admin.abuseSignalsForUser);
router.get('/users/:id/issues', idParamValidator, admin.issuesForUserAdmin);

router.get('/audit-logs', admin.auditLogs);

export default router;