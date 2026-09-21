import { query } from '../config/database.js';

const WEIGHTS = {
  severity: 30,
  votes: 20,
  age: 15,
  duplicates: 15,
  location: 10,
  escalation: 10,
};

export function scoreToPriority(score) {
  if (score < 30) return 'LOW';
  if (score < 50) return 'MEDIUM';
  if (score < 75) return 'HIGH';
  return 'CRITICAL';
}

export function priorityLabel(label) {
  switch (label) {
    case 'CRITICAL': return 'Critical';
    case 'HIGH': return 'High';
    case 'MEDIUM': return 'Medium';
    default: return 'Low';
  }
}

/**
 * Explainable priority engine.
 * Returns the score, level and a human readable list of reasons.
 */
export async function computePriority({ issue, category, stats }) {
  const reasons = [];

  // 1. Category severity (1-5)
  const severityRatio = (category.severity ?? 3) / 5;
  const severityScore = Math.round(severityRatio * WEIGHTS.severity);
  reasons.push({
    label: `${category.name} severity (${category.severity}/5)`,
    points: severityScore,
  });

  // 2. Community support (up to 20 pts at 100 votes)
  const voteFactor = Math.min((stats.voteCount || 0) / 100, 1);
  const votesScore = Math.round(voteFactor * WEIGHTS.votes);
  if (stats.voteCount > 0) {
    reasons.push({
      label: `${stats.voteCount} citizen vote${stats.voteCount > 1 ? 's' : ''}`,
      points: votesScore,
    });
  }

  // 3. Age of the issue (full 15 after 30 days unresolved)
  const ageDays = Math.max(0, (Date.now() - new Date(stats.createdAt).getTime()) / 86400000);
  const ageFactor = Math.min(ageDays / 30, 1);
  const ageScore = Math.round(ageFactor * WEIGHTS.age);
  if (ageDays >= 1) {
    reasons.push({
      label: `${Math.floor(ageDays)} day${Math.floor(ageDays) > 1 ? 's' : ''} unresolved`,
      points: ageScore,
    });
  }

  // 4. Duplicate reports consolidated into this issue
  const dupFactor = Math.min((stats.duplicateCount || 0) / 5, 1);
  const dupScore = Math.round(dupFactor * WEIGHTS.duplicates);
  if (stats.duplicateCount > 0) {
    reasons.push({
      label: `${stats.duplicateCount} duplicate report${stats.duplicateCount > 1 ? 's' : ''} merged`,
      points: dupScore,
    });
  }

  // 5. Location importance: density of open issues nearby
  const locFactor = Math.min((stats.nearbyOpenCount || 0) / 5, 1);
  const locScore = Math.round(locFactor * WEIGHTS.location);
  if (stats.nearbyOpenCount > 0) {
    reasons.push({
      label: `${stats.nearbyOpenCount} related issue${stats.nearbyOpenCount > 1 ? 's' : ''} nearby`,
      points: locScore,
    });
  }

  // 6. Escalation (issue was escalated, meaning it is being neglected)
  const escFactor = Math.min((stats.escalationCount || 0) / 2, 1);
  const escScore = Math.round(escFactor * WEIGHTS.escalation);
  if (stats.escalationCount > 0) {
    reasons.push({
      label: `${stats.escalationCount} escalation${stats.escalationCount > 1 ? 's' : ''} on record`,
      points: escScore,
    });
  }

  const total = Math.min(
    100,
    severityScore + votesScore + ageScore + dupScore + locScore + escScore,
  );
  return { score: total, priority: scoreToPriority(total), reasons };
}

export async function recordPriority({ issueId, score, priority, reasons }) {
  await query(
    `INSERT INTO priority_history (issue_id, priority, priority_score, reasons_json)
     VALUES (?, ?, ?, ?)`,
    [issueId, priority, score, JSON.stringify(reasons)],
  );
}

export async function getPriorityHistory(issueId) {
  return query(
    'SELECT * FROM priority_history WHERE issue_id = ? ORDER BY created_at DESC',
    [issueId],
  );
}