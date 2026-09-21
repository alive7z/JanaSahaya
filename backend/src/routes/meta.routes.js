import { Router } from 'express';
import { success } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { categoriesAll } from '../repositories/issue.repository.js';
import { listDepartments } from '../services/department.service.js';
import { query } from '../config/database.js';
import { slaViolations, slaWarnings } from '../services/sla.service.js';
import { heatmapData } from '../services/map.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [categories, departments, slaRules] = await Promise.all([
      categoriesAll(),
      listDepartments(),
      query('SELECT priority, hours, description FROM sla_rules'),
    ]);
    success(res, 200, 'Meta data fetched', { categories, departments, slaRules });
  }),
);

router.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    const departments = await listDepartments();
    success(res, 200, 'Departments', { departments });
  }),
);

router.get(
  '/heatmap',
  asyncHandler(async (_req, res) => {
    const points = await heatmapData();
    success(res, 200, 'Heatmap data', { points });
  }),
);

router.get(
  '/sla',
  asyncHandler(async (_req, res) => {
    const [violations, warnings] = await Promise.all([slaViolations(), slaWarnings()]);
    success(res, 200, 'SLA status', { violations, warnings });
  }),
);

export default router;