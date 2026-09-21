// Minimal dependency-free load harness.
//
// Usage:
//   node tests/load/benchmark.mjs [baseUrl] [durationSeconds]
//
// Exercises the most common read paths with concurrent requests and prints
// throughput, latency percentiles and error rates. Authorised paths need a
// seeded admin / officer, so by default it benchmarks the anonymous routes.

const BASE = process.argv[2] || 'http://localhost:4000';
const DURATION_S = parseInt(process.argv[3] || '10', 10);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || '32');

const endpoints = [
  { path: '/ready', weight: 5 },
  { path: '/api/v1/meta', weight: 10 },
  { path: '/api/v1/issues?page=1&limit=10', weight: 10 },
  { path: '/api/v1/categories', weight: 5 },
];

const pool = [];
const start = Date.now();
let inflight = 0;
let complete = 0;
const latencies = [];
let codes = {};
let failures = 0;

function weightedEndpoint() {
  const total = endpoints.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of endpoints) {
    r -= e.weight;
    if (r <= 0) return `${BASE}${e.path}`;
  }
  return `${BASE}${endpoints[0].path}`;
}

function bomb() {
  const url = weightedEndpoint();
  const t0 = performance.now();
  fetch(url)
    .then((res) => {
      inflight -= 1;
      const ms = performance.now() - t0;
      latencies.push(ms);
      codes[res.status] = (codes[res.status] || 0) + 1;
      complete += 1;
    })
    .catch(() => {
      inflight -= 1;
      failures += 1;
      complete += 1;
    })
    .finally(() => {
      if (Date.now() - start >= DURATION_S * 1000) {
        maybeDone();
        return;
      }
      if (inflight < CONCURRENCY) spawn();
    });
}

function spawn() {
  while (inflight < CONCURRENCY && Date.now() - start < DURATION_S * 1000) {
    inflight += 1;
    bomb();
  }
}

let timer;
function maybeDone() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (inflight === 0) report();
  }, 2000);
}
if (inflight === 0) spawn();

function report() {
  const elapsed = (Date.now() - start) / 1000;
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] || 0;
  console.log(`\nLoad results — ${BASE}  (${DURATION_S}s @ concurrency ${CONCURRENCY})`);
  console.log(`  requests:         ${complete}`);
  console.log(`  throughput:       ${(complete / elapsed).toFixed(1)} req/s`);
  console.log(`  failures:         ${failures}${failures ? '  <--- check logs' : ''}`);
  console.log(`  status codes:     ${JSON.stringify(codes)}`);
  console.log(`  latency p50:      ${p(0.5).toFixed(1)}ms`);
  console.log(`  latency p95:      ${p(0.95).toFixed(1)}ms`);
  console.log(`  latency p99:      ${p(0.99).toFixed(1)}ms`);
  console.log(`  max:              ${(sorted[sorted.length - 1] || 0).toFixed(1)}ms`);
  process.exit(failures ? 1 : 0);
}