import {
  getIssueProximity,
  getDuplicateCandidatesForIssue,
  addDuplicateCandidate,
} from '../repositories/issue.repository.js';
import { distanceInMeters, haversineScore } from '../utils/haversine.js';
import { textScore } from '../utils/similarity.js';
import { getOne, query } from '../config/database.js';

const DUPLICATE_THRESHOLD = 70;
const SEARCH_RADIUS = 500; // metres
const MAX_CANDIDATES = 5;

export { DUPLICATE_THRESHOLD };

/**
 * Pure scoring function (unit tested):
 *   distance   <=50m -> 40, <=100m -> 30, <=250m -> 20, <=500m -> 10
 *   category   same  -> 25
 *   text       title+description similarity -> up to 25
 *   recency    reported within 7 days -> 10
 */
export function scoreCandidate({ distanceMetres, categoryMatch, textScoreValue, isRecent }) {
  return (
    haversineScore(distanceMetres) +
    (categoryMatch ? 25 : 0) +
    Math.min(textScoreValue, 25) +
    (isRecent ? 10 : 0)
  );
}

/**
 * Duplicate detection engine.
 */
export async function detectDuplicates({ title, description, categoryId, latitude, longitude, excludeId = null }) {
  const nearby = await getIssueProximity({
    latitude,
    longitude,
    categoryId,
    excludeId,
  });

  const candidates = [];

  for (const issue of nearby) {
    const distance = distanceInMeters(latitude, longitude, issue.latitude, issue.longitude);
    if (distance > SEARCH_RADIUS) continue;

    const text = textScore(`${title} ${description}`, `${issue.title} ${issue.description ?? ''}`);
    const isRecent =
      Date.now() - new Date(issue.created_at).getTime() < 7 * 86400000;

    const total = scoreCandidate({
      distanceMetres: distance,
      categoryMatch: true,
      textScoreValue: text,
      isRecent,
    });

    candidates.push({
      candidateIssue: issue,
      distance,
      textScore: text,
      score: total,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    threshold: DUPLICATE_THRESHOLD,
    candidates: candidates.slice(0, MAX_CANDIDATES).map((c) => ({
      issue: c.candidateIssue,
      distance: c.distance,
      textScore: c.textScore,
      score: c.score,
      isLikelyDuplicate: c.score >= DUPLICATE_THRESHOLD,
    })),
  };
}

export async function persistDuplicateCandidates(issueId, similarities) {
  for (const s of similarities) {
    await addDuplicateCandidate({
      issueId,
      duplicateOfId: s.issue.id,
      score: s.score,
      categoryHit: 1,
      distanceMetres: s.distance,
      textSimilarity: s.textScore / 25,
    });
  }
}

export async function listCandidates(issueId) {
  return getDuplicateCandidatesForIssue(issueId);
}

/** Number of open issues in radius (hotspot density). */
export async function countNearbyOpen({ latitude, longitude, radius = 250, excludeId = null }) {
  const row = await getOne(
    `SELECT COUNT(*) AS n FROM issues
     WHERE status IN ('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','REOPENED')
       AND latitude BETWEEN ? AND ?
       AND longitude BETWEEN ? AND ?
       ${excludeId ? 'AND id <> ?' : ''}`,
    [
      Number(latitude) - radius / 111000,
      Number(latitude) + radius / 111000,
      Number(longitude) - radius / (111000 * Math.max(Math.abs(Math.cos((latitude * Math.PI) / 180)), 0.01)),
      Number(longitude) + radius / (111000 * Math.max(Math.abs(Math.cos((latitude * Math.PI) / 180)), 0.01)),
      ...(excludeId ? [excludeId] : []),
    ],
  );
  return row?.n ?? 0;
}

export async function duplicateCountFor(issueId) {
  const rows = await query(
    'SELECT COUNT(*) AS n FROM issues WHERE duplicate_of_id = ? AND status = ?',
    [issueId, 'DUPLICATE'],
  );
  return rows[0]?.n ?? 0;
}