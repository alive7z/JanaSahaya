import { query } from '../config/database.js';
import { distanceInMeters, haversine } from '../utils/haversine.js';

const MAP_FIELDS = `
  SELECT i.id, i.title, i.latitude, i.longitude, i.address, i.city, i.ward,
         i.status, i.priority, i.vote_count, i.created_at, i.location_source,
         c.id AS category_id, c.name AS category_name,
         d.id AS department_id, d.name AS department_name
  FROM issues i
  JOIN issue_categories c ON c.id = i.category_id
  LEFT JOIN departments d ON d.id = i.department_id
`;

/** A privacy-safe map projection. It never exposes reporter or assignment data. */
export async function getMapIssues({
  lat = null,
  lng = null,
  radius = null,
  status = [],
  categoryId = null,
  priority = null,
  departmentId = null,
  createdFrom = null,
  createdTo = null,
  includeRejected = false,
} = {}) {
  const where = ['i.deleted_at IS NULL'];
  const params = [];

  if (!includeRejected) where.push("i.status <> 'REJECTED'");
  if (status.length) {
    where.push(`i.status IN (${status.map(() => '?').join(',')})`);
    params.push(...status);
  }
  if (categoryId) { where.push('i.category_id = ?'); params.push(categoryId); }
  if (priority) { where.push('i.priority = ?'); params.push(priority); }
  if (departmentId) { where.push('i.department_id = ?'); params.push(departmentId); }
  if (createdFrom) { where.push('i.created_at >= ?'); params.push(createdFrom); }
  if (createdTo) { where.push('i.created_at <= ?'); params.push(createdTo); }

  if (radius != null) {
    const degLat = radius / 111000;
    const degLng = radius / (111000 * Math.max(Math.abs(Math.cos((lat * Math.PI) / 180)), 0.01));
    where.push('i.latitude BETWEEN ? AND ?');
    where.push('i.longitude BETWEEN ? AND ?');
    params.push(lat - degLat, lat + degLat, lng - degLng, lng + degLng);
  }

  const rows = await query(
    `${MAP_FIELDS} WHERE ${where.join(' AND ')} ORDER BY i.created_at DESC`,
    params,
  );

  const issues = rows
    .filter((row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude)))
    .map((row) => radius == null ? row : {
      ...row,
      exact_distance_metres: haversine(lat, lng, Number(row.latitude), Number(row.longitude)),
      distance_metres: distanceInMeters(lat, lng, Number(row.latitude), Number(row.longitude)),
    })
    .filter((row) => radius == null || row.exact_distance_metres <= radius)
    .map(({ exact_distance_metres, ...row }) => row);

  return {
    lat,
    lng,
    radius,
    count: issues.length,
    issues,
  };
}

export async function getNearbyForMap({ lat, lng, radius = 1000, ...filters }) {
  return getMapIssues({ lat, lng, radius, ...filters });
}

export async function heatmapData() {
  return query(
    `SELECT i.latitude, i.longitude, i.status, i.priority,
            c.slug AS category
     FROM issues i
     JOIN issue_categories c ON c.id = i.category_id
     WHERE i.status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
     ORDER BY i.created_at DESC
     LIMIT 500`,
  );
}
