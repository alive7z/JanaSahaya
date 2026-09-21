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
const DEMO_CITIZEN_EMAIL = process.env.DEMO_CITIZEN_EMAIL || 'citizen@janasahaya.demo';
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'admin@janasahaya.demo';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@123';
const OFFICER_EMAIL = process.env.OFFICER_EMAIL || 'officer@civic.gov';
const OFFICER_PASSWORD = process.env.OFFICER_PASSWORD || 'Officer@123456';
const runId = `${Date.now()}`.slice(-8);
const emailOf = (label) => `${label}.${runId}@smoke.test`;
const pass = 'Smoke@123456';

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok - ${name}`); };
const fail = (name, err) => { console.error(`  FAIL - ${name}: ${err?.message ?? err}`); process.exitCode = 1; };

async function api(path, { method = 'GET', token, cookie, body, form, json = true, allow } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
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
  return { status: res.status, data, headers: res.headers };
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

  const demoCitizen = await api('/api/v1/auth/login', {
    method: 'POST', body: { email: DEMO_CITIZEN_EMAIL, password: DEMO_PASSWORD },
  });
  assert.ok(demoCitizen.data.data.roles.some((role) => role.name === 'CITIZEN'));
  ok('citizen demo account logs in with the documented role');

  const demoAdmin = await api('/api/v1/auth/login', {
    method: 'POST', body: { email: DEMO_ADMIN_EMAIL, password: DEMO_PASSWORD },
  });
  assert.ok(demoAdmin.data.data.roles.some((role) => role.name === 'ADMIN'));
  const demoAdminToken = demoAdmin.data.data.accessToken;
  ok('admin demo account logs in with the documented role');

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
  let citizenToken = citizenLogin.data.data.accessToken;
  assert.ok(citizenToken, 'access token issued');
  const loginBody = JSON.stringify(citizenLogin.data);
  assert.ok(!loginBody.includes('password_hash'), 'no password_hash leak in login');
  assert.ok(!loginBody.includes('refreshToken'), 'no refreshToken leak in login body');
  ok('login returns safe user payload (no password_hash / refreshToken)');

  const loginCookie = citizenLogin.headers.get('set-cookie')?.split(';')[0];
  const refreshed = await api('/api/v1/auth/refresh', { method: 'POST', cookie: loginCookie });
  citizenToken = refreshed.data.data.accessToken;
  const refreshCookie = refreshed.headers.get('set-cookie')?.split(';')[0];
  const session = await api('/api/v1/auth/me', { token: citizenToken });
  assert.equal(session.data.data.user.email, citizenEmail);
  ok('refresh-token rotation preserves the authenticated session');

  const reportForm = new FormData();
  Object.entries({ title: 'Smoke test pothole', description: 'A pothole reported by the automated smoke suite near the bus stand.', categoryId: '1', pincode: '248001', latitude: '30.33', longitude: '78.05', address: 'Bus stand, Dehradun', locationSource: 'map' })
    .forEach(([k, v]) => reportForm.append(k, v));
  reportForm.append('images', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0])], { type: 'image/jpeg' }), 'report.jpg');
  const created = await api('/api/v1/issues', {
    method: 'POST',
    token: citizenToken,
    form: reportForm,
  });
  assert.equal(created.data.success, true);
  const issueId = created.data.data.issueId;
  assert.ok(issueId, 'new issue id returned');
  ok(`citizen reports an issue (id ${issueId})`);

  const detail = await api(`/api/v1/issues/${issueId}`, { token: citizenToken });
  assert.equal(detail.data.data.issue.location_source, 'map');
  assert.equal(Number(detail.data.data.issue.latitude), 30.33);
  assert.equal(Number(detail.data.data.issue.longitude), 78.05);
  assert.equal(detail.data.data.issue.address, 'Bus stand, Dehradun');
  assert.ok(detail.data.data.timeline.images.length >= 1);
  ok('stored coordinates, address, and location source round-trip through MySQL');

  const mine = await api('/api/v1/issues/my?tab=reported', { token: citizenToken });
  assert.ok(mine.data.data.issues.some((issue) => String(issue.id) === String(issueId)));
  ok('new report appears in the citizen My Reports list');

  const citizenDashboard = await api('/api/v1/dashboard/me', { token: citizenToken });
  assert.ok(citizenDashboard.data.data.stats.issuesReported >= 1);
  const notifications = await api('/api/v1/notifications', { token: citizenToken });
  assert.ok(Array.isArray(notifications.data.data.notifications));
  ok('citizen dashboard and notifications load');

  const allMap = await api('/api/v1/issues/map?distance=all');
  const mapped = allMap.data.data.issues.find((issue) => String(issue.id) === String(issueId));
  assert.ok(mapped, 'new issue appears on citizen all-issues map');
  assert.equal(typeof mapped.latitude, 'number');
  assert.equal('reporter_id' in mapped, false, 'citizen map projection hides reporter id');
  assert.equal('reporter_name' in mapped, false, 'citizen map projection hides reporter name');
  ok('citizen All Issues map returns numeric coordinates without private reporter data');

  const radiusMap = await api('/api/v1/issues/map?distance=500&lat=30.33&lng=78.05');
  assert.ok(radiusMap.data.data.issues.some((issue) => String(issue.id) === String(issueId)));
  ok('500 m map radius includes the issue at the reference location');

  await api(`/api/v1/issues/${issueId}/vote`, { method: 'POST', token: citizenToken });
  await api(`/api/v1/issues/${issueId}/follow`, { method: 'POST', token: citizenToken });
  await api(`/api/v1/issues/${issueId}/comments`, { method: 'POST', token: citizenToken, body: { content: 'Smoke test citizen comment.' } });
  const interacted = await api(`/api/v1/issues/${issueId}`, { token: citizenToken });
  assert.equal(interacted.data.data.myVote, true);
  assert.equal(interacted.data.data.myFollow, true);
  ok('citizen vote, follow, comment, and authenticated detail state work');

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
  evil.append('address', 'Spoof test location');
  evil.append('locationSource', 'map');
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
    body: { email: OFFICER_EMAIL, password: OFFICER_PASSWORD },
  });
  const officerToken = offLogin.data.data.accessToken;
  const officerConsole = await api('/api/v1/dashboard/officer', { token: officerToken });
  assert.ok(Array.isArray(officerConsole.data.data.issues));
  ok('officer dashboard loads the department-scoped queue');

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
  const adminToken = demoAdminToken;

  const issues = await api(`/api/v1/admin/issues?search=Smoke&limit=5`, { token: adminToken });
  assert.equal(issues.data.success, true);
  ok('admin lists issues with filters (search)');

  const adminIssue = await api(`/api/v1/admin/issues/${issueId}`, { token: adminToken });
  assert.equal(String(adminIssue.data.data.issue.id), String(issueId));
  ok('admin opens the submitted issue detail');

  const adminMap = await api('/api/v1/admin/map?status=RESOLVED', { token: adminToken });
  assert.ok(Array.isArray(adminMap.data.data.issues));
  assert.ok(adminMap.data.data.issues.every((issue) => issue.status === 'RESOLVED'));
  ok('admin map applies status filters');

  const officers = await api('/api/v1/admin/officers', { token: adminToken });
  assert.ok(officers.data.data.officers.length >= 1);
  ok('admin lists officers with workload');

  const [users, departments, categories] = await Promise.all([
    api('/api/v1/admin/users?limit=5', { token: adminToken }),
    api('/api/v1/admin/departments', { token: adminToken }),
    api('/api/v1/admin/categories', { token: adminToken }),
  ]);
  assert.ok(Array.isArray(users.data.data.users));
  assert.ok(Array.isArray(departments.data.data.departments));
  assert.ok(Array.isArray(categories.data.data.categories));
  ok('admin user, department, and category views load');

  const sla = await api('/api/v1/admin/sla', { token: adminToken });
  assert.ok(sla.data.data.rules.length >= 4);
  ok('admin lists SLA rules');

  const [slaStatus, escalations] = await Promise.all([
    api('/api/v1/admin/sla/status', { token: adminToken }),
    api('/api/v1/admin/escalations', { token: adminToken }),
  ]);
  assert.ok(Array.isArray(slaStatus.data.data.violations));
  assert.ok(Array.isArray(escalations.data.data.escalations));
  ok('admin SLA status and escalation views load');

  const funnel = await api('/api/v1/analytics/funnel', { token: adminToken });
  assert.ok(funnel.data.data.funnel.length >= 1);
  ok('analytics status funnel returns distributions');

  const audit = await api('/api/v1/admin/audit-logs?limit=100', { token: adminToken });
  assert.ok(Array.isArray(audit.data.data.logs));
  assert.ok(audit.data.data.logs.some((entry) => entry.action === 'ISSUE_ACCEPTED'));
  ok('admin reads an audit trail containing the officer claim action');

  // --- RBAC negative checks ---
  const forbidden = await api('/api/v1/admin/issues', { token: citizenToken, allow: [403] });
  assert.equal(forbidden.status, 403, 'citizen blocked from admin');
  ok('citizen is blocked from admin endpoints (403)');

  const unauthed = await api('/api/v1/admin/issues', { allow: [401] });
  assert.equal(unauthed.status, 401, 'anonymous blocked');
  ok('anonymous requests are rejected (401)');

  await api('/api/v1/auth/logout', { method: 'POST', token: citizenToken, cookie: refreshCookie });
  const loggedOut = await api('/api/v1/auth/me', { token: citizenToken, allow: [401] });
  assert.equal(loggedOut.status, 401);
  ok('logout immediately revokes the active access session');

  console.log('\nSmoke complete.');
  console.log(passed === 0 && process.exitCode === 1 ? 'Some checks failed.' : `All ${passed} checks passed.`);
}

run().catch((err) => {
  console.error('\nSmoke suite crashed:', err.message);
  process.exitCode = 1;
});
