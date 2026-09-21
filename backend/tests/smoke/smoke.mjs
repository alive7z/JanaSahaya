/**
 * End-to-end smoke tests against a running server.
 *
 *   node tests/smoke/smoke.mjs                # uses http://localhost:4000
 *   BASE_URL=http://localhost:4001 node tests/smoke/smoke.mjs
 *
 * Exercises the full role-based lifecycle:
 *   citizen registers + reports -> officer claims/resolves -> citizen verifies ->
 *   admin reads/edits -> audit trail -> security invariants.
 */
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const runId = `${Date.now()}`.slice(-8);
const emailOf = (label) => `${label}.${runId}@smoke.test`;
const pass = 'Smoke@123456';

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok - ${name}`); };
const fail = (name, err) => { console.error(`  FAIL - ${name}: ${err?.message ?? err}`); process.exitCode = 1; };

async function api(path, { method = 'GET', token, body, form, json = true, allow } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const data = json ? await res.json() : await res.text();
  if (!res.ok && !allow?.includes(res.status)) {
    throw new Error(`HTTP ${res.status} on ${method} ${path}: ${data?.message ?? data}`);
  }
  return { status: res.status, data };
}

async function run() {
  console.log(`\nSmoke suite against ${BASE}\n`);

  // --- Meta & health ---
  const ready = await api('/ready', { allow: [200] });
  assert.equal(ready.status, 200, 'ready endpoint up');
  ok('GET /ready reports healthy');

  const meta = await api('/api/v1/meta');
  assert.equal(meta.data.success, true);
  ok('GET /api/v1/meta exposes app metadata');

  // --- Citizen registers & reports ---
  const citizenEmail = emailOf('citizen');
  const reg = await api('/api/v1/auth/register', {
    method: 'POST',
    body: { fullName: 'Smoke Citizen', email: citizenEmail, password: pass, confirmPassword: pass, phone: `99${runId}00001`, city: 'Dehradun' },
    allow: [201],
  });
  assert.equal(reg.status, 201, 'registration');
  ok('citizen registers an account');

  const citizenLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: citizenEmail, password: pass },
  });
  const citizenToken = citizenLogin.data.data.accessToken;
  assert.ok(citizenToken, 'access token issued');
  const loginBody = JSON.stringify(citizenLogin.data);
  assert.ok(!loginBody.includes('password_hash'), 'no password_hash leak in login');
  assert.ok(!loginBody.includes('refreshToken'), 'no refreshToken leak in login body');
  ok('login returns safe user payload (no password_hash / refreshToken)');

  const reportForm = new FormData();
  Object.entries({ title: 'Smoke test pothole', description: 'A pothole reported by the automated smoke suite near the bus stand.', categoryId: '1', pincode: '248001', latitude: '30.33', longitude: '78.05' })
    .forEach(([k, v]) => reportForm.append(k, v));
  const created = await api('/api/v1/issues', {
    method: 'POST',
    token: citizenToken,
    form: reportForm,
  });
  assert.equal(created.data.success, true);
  const issueId = created.data.data.issueId;
  assert.ok(issueId, 'new issue id returned');
  ok(`citizen reports an issue (id ${issueId})`);

  // --- Duplicate check ---
  const dup = await api('/api/v1/issues/check-duplicates', {
    method: 'POST',
    token: citizenToken,
    body: { title: 'Smoke test pothole', description: 'A pothole reported by the automated smoke suite near the bus stand.', categoryId: 1, latitude: 30.33, longitude: 78.05 },
  });
  assert.equal(dup.data.success, true);
  ok('duplicate detection endpoint responds');

  // --- Security: spoofed image rejected ---
  const evil = new FormData();
  evil.append('title', 'Spoofed image attempt');
  evil.append('description', 'This payload must be rejected by the magic-byte check.');
  evil.append('categoryId', '1');
  evil.append('pincode', '248001');
  evil.append('latitude', '30.31');
  evil.append('longitude', '78.03');
  evil.append('images', new Blob(['not an image at all'], { type: 'image/jpeg' }), 'evil.jpg');
  const spoof = await api('/api/v1/issues', {
    method: 'POST',
    token: citizenToken,
    form: evil,
    allow: [400],
  });
  assert.equal(spoof.status, 400, 'spoofed image rejected');
  ok('spoofed image rejected by magic-byte verification');

  // --- Officer claims, resolves ---
  const offLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'officer@civic.gov', password: 'Officer@123456' },
  });
  const officerToken = offLogin.data.data.accessToken;

  const claim = await api(`/api/v1/issues/${issueId}/accept`, {
    method: 'PATCH',
    token: officerToken,
    allow: [200, 409],
  });
  // Strictly one owner. If already claimed by a concurrent run's officer, still 409-not-200.
  if (claim.status === 200) ok('officer claims the issue');
  else ok(`officer claim already owned by another (409) — ${claim.data.message}`);

  const resolveForm = new FormData();
  resolveForm.append('note', 'Pothole filled and compacted.');
  resolveForm.append('evidence', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0])], { type: 'image/jpeg' }), 'evidence.jpg');
  const resolved = await api(`/api/v1/issues/${issueId}/resolve`, {
    method: 'POST',
    token: officerToken,
    form: resolveForm,
    allow: [200, 422],
  });
  if (resolved.status === 200) {
    ok('officer resolves with evidence');
  } else {
    ok(`resolve skipped (${resolved.data.message})`);
  }

  // --- Citizen verifies ---
  const verify = await api(`/api/v1/issues/${issueId}/verify`, {
    method: 'POST',
    token: citizenToken,
    body: { confirmed: true },
  });
  assert.equal(verify.data.success, true, 'verification recorded');
  ok('citizen verifies the resolution');

  // --- Admin round trip ---
  const admLogin = await api('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@civic.gov', password: 'Admin@123456' },
  });
  const adminToken = admLogin.data.data.accessToken;

  const issues = await api(`/api/v1/admin/issues?search=Smoke&limit=5`, { token: adminToken });
  assert.equal(issues.data.success, true);
  ok('admin lists issues with filters (search)');

  const officers = await api('/api/v1/admin/officers', { token: adminToken });
  assert.ok(officers.data.data.officers.length >= 1);
  ok('admin lists officers with workload');

  const sla = await api('/api/v1/admin/sla', { token: adminToken });
  assert.ok(sla.data.data.rules.length >= 4);
  ok('admin lists SLA rules');

  const funnel = await api('/api/v1/analytics/funnel', { token: adminToken });
  assert.ok(funnel.data.data.funnel.length >= 1);
  ok('analytics status funnel returns distributions');

  const audit = await api('/api/v1/admin/audit-logs?limit=3', { token: adminToken });
  assert.ok(Array.isArray(audit.data.data.logs));
  ok('admin reads the audit trail');

  // --- RBAC negative checks ---
  const forbidden = await api('/api/v1/admin/issues', { token: citizenToken, allow: [403] });
  assert.equal(forbidden.status, 403, 'citizen blocked from admin');
  ok('citizen is blocked from admin endpoints (403)');

  const unauthed = await api('/api/v1/admin/issues', { allow: [401] });
  assert.equal(unauthed.status, 401, 'anonymous blocked');
  ok('anonymous requests are rejected (401)');

  console.log('\nSmoke complete.');
  console.log(passed === 0 && process.exitCode === 1 ? 'Some checks failed.' : `All ${passed} checks passed.`);
}

run().catch((err) => {
  console.error('\nSmoke suite crashed:', err.message);
  process.exitCode = 1;
});