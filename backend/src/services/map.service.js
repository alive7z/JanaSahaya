import { getOne, query } from '../config/database.js';
import { distanceInMeters } from '../utils/haversine.js';

export async function getNearbyForMap({ lat, lng, radius = 1000 }) {
  // Bounding box approximation, then exact distance filtering.
  const degLat = radius / 111000;
  const degLng =
    radius /
    (111000 * Math.max(Math.abs(Math.cos((lat * Math.PI) / 180)), 0.01));

  const rows = await query(
    `SELECT i.id, i.title, i.latitude, i.longitude, i.status, i.priority, i.vote_count,
            c.name AS category_name, i.created_at
     FROM issues i
     JOIN issue_categories c ON c.id = i.category_id
     WHERE i.latitude BETWEEN ? AND ?
       AND i.longitude BETWEEN ? AND ?
     ORDER BY i.created_at DESC`,
    [lat - degLat, lat + degLat, lng - degLng, lng + degLng],
  );

  const issues = rows
    .map((r) => ({
      ...r,
      distance_metres: distanceInMeters(lat, lng, r.latitude, r.longitude),
    }))
    .filter((r) => r.distance_metres <= radius);

  return {
    lat,
    lng,
    radius,
    count: issues.length,
    issues,
  };
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