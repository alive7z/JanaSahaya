import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversine, distanceInMeters, haversineScore } from '../src/utils/haversine.js';

test('haversine returns ~85m for the spec example', () => {
  const d = distanceInMeters(30.3753, 78.0322, 30.3759, 78.0317);
  assert.ok(d >= 70 && d <= 100, `got ${d}`);
});

test('haversine distance is zero for identical points', () => {
  assert.equal(distanceInMeters(30.3753, 78.0322, 30.3753, 78.0322), 0);
});

test('haversineDistance is symmetric', () => {
  const a = haversine(28.6139, 77.209, 30.3165, 78.0322);
  const b = haversine(30.3165, 78.0322, 28.6139, 77.209);
  assert.ok(Math.abs(a - b) < 0.001);
});

test('haversineScore buckets distances', () => {
  assert.equal(haversineScore(20), 40);
  assert.equal(haversineScore(75), 30);
  assert.equal(haversineScore(150), 20);
  assert.equal(haversineScore(300), 10);
  assert.equal(haversineScore(1000), 0);
});

test('haversine preserves exact radius boundaries before display rounding', () => {
  const latitudeDeltaFor500m = (500 / 6371000) * (180 / Math.PI);
  const boundary = haversine(0, 0, latitudeDeltaFor500m, 0);
  const outside = haversine(0, 0, latitudeDeltaFor500m * 1.001, 0);
  assert.ok(Math.abs(boundary - 500) < 0.0001, `boundary was ${boundary}`);
  assert.ok(boundary <= 500);
  assert.ok(outside > 500);
});
