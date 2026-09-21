import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textSimilarity, textScore, tokenize } from '../src/utils/similarity.js';

test('tokenize lowercases and strips punctuation', () => {
  assert.deepEqual(tokenize('Large pothole near GEHU gate!'), ['large', 'pothole', 'near', 'gehu', 'gate']);
});

test('identical text is fully similar', () => {
  assert.ok(textSimilarity('pothole near college gate', 'pothole near college gate') > 0.99);
});

test('unrelated text has low similarity', () => {
  assert.ok(textSimilarity('broken street light', 'water pipeline leakage') < 0.3);
});

test('textScore stays within 0..25', () => {
  assert.ok(textScore('a b c d e', 'a b c d e') <= 25);
  assert.ok(textScore('a b c d e', 'x y z w') === 0);
});