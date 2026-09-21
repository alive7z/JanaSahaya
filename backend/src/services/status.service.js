import AppError from '../utils/AppError.js';

export const ALL_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
  'DUPLICATE',
  'REOPENED',
];

/**
 * Allowed lifecycle transitions (spec: prevent invalid transitions).
 * SUBMITTED -> CLOSED directly is intentionally forbidden.
 */
export const TRANSITIONS = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'DUPLICATE', 'ASSIGNED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED', 'DUPLICATE'],
  ASSIGNED: ['IN_PROGRESS', 'UNDER_REVIEW', 'REOPENED', 'DUPLICATE'],
  IN_PROGRESS: ['RESOLVED', 'REOPENED', 'DUPLICATE'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REJECTED: ['REOPENED', 'SUBMITTED'],
  DUPLICATE: ['REOPENED'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'DUPLICATE'],
};

/** Which roles are allowed to perform each transition. */
export const TRANSITION_ACTORS = {
  'SUBMITTED:ASSIGNED': ['OFFICER', 'ADMIN'],
  'UNDER_REVIEW:ASSIGNED': ['OFFICER', 'ADMIN'],
  'ASSIGNED:IN_PROGRESS': ['OFFICER', 'ADMIN'],
  'IN_PROGRESS:RESOLVED': ['OFFICER', 'ADMIN'],
  'ASSIGNED:UNDER_REVIEW': ['ADMIN'],
  'ASSIGNED:REOPENED': ['ADMIN'],
  'ASSIGNED:DUPLICATE': ['ADMIN'],
  'IN_PROGRESS:DUPLICATE': ['ADMIN'],
  'IN_PROGRESS:REOPENED': ['ADMIN'],
  'REOPENED:ASSIGNED': ['ADMIN'],
  'REOPENED:IN_PROGRESS': ['OFFICER', 'ADMIN'],
  'REOPENED:RESOLVED': ['OFFICER', 'ADMIN'],
  'REOPENED:CLOSED': ['OFFICER', 'ADMIN'],
  'REOPENED:DUPLICATE': ['ADMIN'],
  'RESOLVED:CLOSED': ['OFFICER', 'ADMIN'],
  'RESOLVED:REOPENED': ['SYSTEM', 'ADMIN'],
  'CLOSED:REOPENED': ['ADMIN'],
  'REJECTED:REOPENED': ['ADMIN'],
  'REJECTED:SUBMITTED': ['ADMIN'],
  'DUPLICATE:REOPENED': ['ADMIN'],
  'SUBMITTED:UNDER_REVIEW': ['OFFICER', 'ADMIN'],
  'SUBMITTED:REJECTED': ['ADMIN'],
  'SUBMITTED:DUPLICATE': ['SYSTEM', 'ADMIN'],
  'UNDER_REVIEW:REJECTED': ['ADMIN'],
  'UNDER_REVIEW:DUPLICATE': ['SYSTEM', 'ADMIN'],
  'REOPENED:UNDER_REVIEW': ['ADMIN'],
};

export function isAllowedTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Validate a status change and permission.
 * actor: 'SYSTEM' | role name (CITIZEN/OFFICER/ADMIN)
 */
export function validateTransition({ from, to, actor, departmentMatch = false }) {
  if (!ALL_STATUSES.includes(to)) {
    throw new AppError(422, `Unknown status: ${to}`);
  }
  if (from === to) {
    throw new AppError(422, 'Issue is already in this status');
  }
  if (!isAllowedTransition(from, to)) {
    throw new AppError(
      422,
      `Invalid transition: ${from} -> ${to} is not permitted`,
    );
  }

  const allowedActors = TRANSITION_ACTORS[`${from}:${to}`];
  if (actor === 'SYSTEM') return;
  if (!allowedActors || !allowedActors.includes(actor)) {
    throw new AppError(403, `Role ${actor} cannot perform ${from} -> ${to}`);
  }

  // Officers may only act on issues assigned to their department.
  if (actor === 'OFFICER' && !departmentMatch) {
    throw new AppError(403, 'You can only manage issues in your department');
  }
}