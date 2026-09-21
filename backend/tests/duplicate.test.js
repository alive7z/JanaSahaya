import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCandidate, DUPLICATE_THRESHOLD } from '../src/services/duplicate.service.js';
import { textScore } from '../src/utils/similarity.js';

test('near identical report within 50m is a likely duplicate', () => {
  const text = textScore('Large pothole near college gate', 'Large pothole near college gate');
  const score = scoreCandidate({
    distanceMetres: 40,
    categoryMatch: true,
    textScoreValue: text,
    isRecent: true,
  });
  assert.ok(score >= DUPLICATE_THRESHOLD, `score ${score} should be >= ${DUPLICATE_THRESHOLD}`);
});

test('far apart or unrelated reports are not duplicates', () => {
  const score = scoreCandidate({
    distanceMetres: 400,
    categoryMatch: true,
    textScoreValue: 5,
    isRecent: false,
  });
  assert.ok(score < DUPLICATE_THRESHOLD, `score ${score}`);
});

test('spec example: pothole 72m away yields a duplicate suggestion', () => {
  // 72m -> 30 (location), same category -> 25, half-similar text -> ~12, recent -> 10
  const score = scoreCandidate({
    distanceMetres: 72,
    categoryMatch: true,
    textScoreValue: 12,
    isRecent: true,
  });
  assert.equal(score, 77);
  assert.ok(score >= DUPLICATE_THRESHOLD);
});

test('spec threshold of 70 is enforced', () => {
  const below = scoreCandidate({ distanceMetres: 150, categoryMatch: true, textScoreValue: 10, isRecent: false });
  assert.equal(below, 55); // 20 + 25 + 10
  assert.ok(below < DUPLICATE_THRESHOLD);
});