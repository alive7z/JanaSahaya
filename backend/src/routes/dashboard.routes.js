import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { idParamValidator } from '../validators/issue.validators.js';

const router = Router();

router.get('/me', authenticate, requireRole('CITIZEN', 'ADMIN'), dashboard.citizenDashboard);
router.get('/officer', authenticate, requireRole('OFFICER', 'ADMIN'), dashboard.officerDashboard);
router.get('/admin', authenticate, requireRole('ADMIN'), dashboard.adminDashboard);
router.get('/issues/:id/priority', authenticate, idParamValidator, dashboard.priorityAudit);

export default router;