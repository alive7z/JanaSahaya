import { Router } from 'express';
import * as analytics from '../controllers/analytics.controller.js';
import { requireRole, authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/overview', authenticate, requireRole('OFFICER', 'ADMIN'), analytics.overview);
router.get('/funnel', authenticate, requireRole('OFFICER', 'ADMIN'), analytics.statusFunnel);
router.get('/sla', authenticate, requireRole('OFFICER', 'ADMIN'), analytics.slaHealth);
router.get('/officers', authenticate, requireRole('ADMIN'), analytics.officerPerformance);
router.get('/categories', authenticate, requireRole('OFFICER', 'ADMIN'), analytics.byCategory);
router.get('/departments', authenticate, requireRole('OFFICER', 'ADMIN'), analytics.byDepartment);
router.get('/locations', authenticate, requireRole('OFFICER', 'ADMIN'), analytics.byLocation);
router.get('/citizens', authenticate, requireRole('ADMIN'), analytics.topActiveCitizens);

export default router;