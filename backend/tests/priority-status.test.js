import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreToPriority } from '../src/services/priority.service.js';
import { isAllowedTransition, validateTransition } from '../src/services/status.service.js';

test('scoreToPriority maps spec thresholds', () => {
  assert.equal(scoreToPriority(0), 'LOW');
  assert.equal(scoreToPriority(29), 'LOW');
  assert.equal(scoreToPriority(30), 'MEDIUM');
  assert.equal(scoreToPriority(49), 'MEDIUM');
  assert.equal(scoreToPriority(50), 'HIGH');
  assert.equal(scoreToPriority(74), 'HIGH');
  assert.equal(scoreToPriority(75), 'CRITICAL');
  assert.equal(scoreToPriority(100), 'CRITICAL');
});

test('valid lifecycle transitions are allowed', () => {
  assert.ok(isAllowedTransition('SUBMITTED', 'UNDER_REVIEW'));
  assert.ok(isAllowedTransition('UNDER_REVIEW', 'ASSIGNED'));
  assert.ok(isAllowedTransition('ASSIGNED', 'IN_PROGRESS'));
  assert.ok(isAllowedTransition('IN_PROGRESS', 'RESOLVED'));
  assert.ok(isAllowedTransition('RESOLVED', 'CLOSED'));
  assert.ok(isAllowedTransition('RESOLVED', 'REOPENED'));
});

test('invalid transition SUBMITTED -> CLOSED is rejected', () => {
  assert.equal(isAllowedTransition('SUBMITTED', 'CLOSED'), false);
  assert.throws(() =>
    validateTransition({ from: 'SUBMITTED', to: 'CLOSED', actor: 'ADMIN' }),
  );
});

test('same-status transition is rejected', () => {
  assert.throws(() =>
    validateTransition({ from: 'ASSIGNED', to: 'ASSIGNED', actor: 'ADMIN' }),
  );
});

test('citizen cannot transition statuses', () => {
  assert.throws(() =>
    validateTransition({ from: 'ASSIGNED', to: 'IN_PROGRESS', actor: 'CITIZEN' }),
  );
});

test('officer cannot touch another department issue', () => {
  assert.throws(() =>
    validateTransition({ from: 'ASSIGNED', to: 'IN_PROGRESS', actor: 'OFFICER', departmentMatch: false }),
  );
  assert.doesNotThrow(() =>
    validateTransition({ from: 'ASSIGNED', to: 'IN_PROGRESS', actor: 'OFFICER', departmentMatch: true }),
  );
});

test('system can mark duplicate', () => {
  assert.doesNotThrow(() =>
    validateTransition({ from: 'SUBMITTED', to: 'DUPLICATE', actor: 'SYSTEM' }),
  );
});