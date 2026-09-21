import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { query } from '../config/database.js';

export const overview = asyncHandler(async (_req, res) => {
  const [issuesPerDay, priorityDistribution] = await Promise.all([
    query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM issues
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
    ),
    query(
      `SELECT priority, COUNT(*) AS count
       FROM issues
       GROUP BY priority`,
    ),
  ]);

  success(res, 200, 'Analytics overview', {
    issuesPerDay: issuesPerDay.map((r) => ({ date: r.date, count: r.count })),
    priorityDistribution,
  });
});

export const byCategory = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT c.id, c.name, c.severity,
            COUNT(i.id) AS total,
            SUM(i.status = 'RESOLVED') AS resolved
     FROM issue_categories c
     LEFT JOIN issues i ON i.category_id = c.id
     GROUP BY c.id, c.name, c.severity
     ORDER BY total DESC`,
  );
  success(res, 200, 'Issues per category', { categories: rows });
});

export const byDepartment = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT d.id, d.name,
            COUNT(i.id) AS total,
            SUM(i.status = 'RESOLVED') AS resolved,
            ROUND(AVG(CASE WHEN i.status = 'RESOLVED' THEN TIMESTAMPDIFF(HOUR, i.created_at, i.resolved_at) END)) AS avg_resolution_hours
     FROM departments d
     LEFT JOIN issues i ON i.department_id = d.id
     GROUP BY d.id, d.name
     ORDER BY total DESC`,
  );
  success(res, 200, 'Issues per department', { departments: rows });
});

export const byLocation = asyncHandler(async (_req, res) => {
  const [byCity, byWard, hotspots] = await Promise.all([
    query(
      `SELECT city, COUNT(*) AS count
       FROM issues WHERE city IS NOT NULL
       GROUP BY city ORDER BY count DESC LIMIT 20`,
    ),
    query(
      `SELECT city, ward, COUNT(*) AS count
       FROM issues WHERE ward IS NOT NULL
       GROUP BY city, ward
       ORDER BY count DESC LIMIT 20`,
    ),
    query(
      `SELECT ROUND(latitude, 3) AS lat, ROUND(longitude, 3) AS lng, COUNT(*) AS count
       FROM issues
       GROUP BY ROUND(latitude, 3), ROUND(longitude, 3)
       ORDER BY count DESC LIMIT 30`,
    ),
  ]);
  success(res, 200, 'Issue locations', { byCity, byWard, hotspots });
});

export const topActiveCitizens = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT u.id, u.full_name, u.points,
            (SELECT COUNT(*) FROM issues i WHERE i.reporter_id = u.id) AS reported
     FROM users u
     ORDER BY u.points DESC
     LIMIT 20`,
  );
  success(res, 200, 'Most active citizens', { citizens: rows });
});

export const statusFunnel = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT status, COUNT(*) AS count FROM issues GROUP BY status ORDER BY count DESC`,
  );
  success(res, 200, 'Issue status funnel', { funnel: rows });
});

export const officerPerformance = asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT u.id, u.full_name, d.name AS department,
            SUM(CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END) AS assigned_total,
            SUM(CASE WHEN i.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
            SUM(CASE WHEN i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED') THEN 1 ELSE 0 END) AS open_total,
            ROUND(AVG(CASE WHEN i.status = 'RESOLVED' THEN TIMESTAMPDIFF(HOUR, i.created_at, i.resolved_at) END)) AS avg_resolution_hours
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id AND r.name = 'OFFICER'
     LEFT JOIN departments d ON d.id = ur.department_id
     LEFT JOIN issues i ON i.assigned_officer_id = u.id
     GROUP BY u.id, u.full_name, d.name
     ORDER BY resolved DESC`,
  );
  success(res, 200, 'Officer performance', { officers: rows });
});

export const slaHealth = asyncHandler(async (_req, res) => {
  const [openOverdue, byPriority, onTrack] = await Promise.all([
    query(
      `SELECT COUNT(*) AS count FROM issues
       WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
         AND resolution_deadline IS NOT NULL
         AND resolution_deadline < NOW()`,
    ),
    query(
      `SELECT priority,
              COUNT(*) AS total,
              SUM(resolution_deadline IS NOT NULL AND resolution_deadline < NOW() AND status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')) AS overdue
       FROM issues
       GROUP BY priority`,
    ),
    query(
      `SELECT COUNT(*) AS count FROM issues
       WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
         AND resolution_deadline IS NOT NULL
         AND resolution_deadline >= NOW()`,
    ),
  ]);
  success(res, 200, 'SLA health', {
    openOverdue: openOverdue[0]?.count ?? 0,
    onTrack: onTrack[0]?.count ?? 0,
    byPriority,
  });
});