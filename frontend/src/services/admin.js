import api from './api';

export async function adminListUsers({ page = 1, search = '' } = {}) {
  const { data } = await api.get('/admin/users', { params: { page, search } });
  return data.data;
}

export async function adminAuditLogs({ page = 1 } = {}) {
  const { data } = await api.get('/admin/audit-logs', { params: { page } });
  return data.data;
}

export async function adminSlaStatus() {
  const { data } = await api.get('/admin/sla/status');
  return data.data;
}

export async function adminDepartments() {
  const { data } = await api.get('/admin/departments');
  return data.data.departments;
}

export async function adminCreateDepartment(body) {
  const { data } = await api.post('/admin/departments', body);
  return data.data;
}

export async function adminCategories() {
  const { data } = await api.get('/admin/categories');
  return data.data.categories;
}

export async function adminCreateCategory(body) {
  const { departmentId, ...rest } = body;
  const { data } = await api.post('/admin/categories', {
    ...rest,
    department_id: departmentId ? Number(departmentId) : null,
  });
  return data.data;
}

export async function adminCreateOfficer(body) {
  const { fullName, departmentId, ...rest } = body;
  const { data } = await api.post('/admin/officers', {
    ...rest,
    full_name: fullName,
    department_id: departmentId ? Number(departmentId) : null,
  });
  return data.data;
}

export async function adminReports() {
  const { data } = await api.get('/admin/moderation/reports');
  return data.data.reports;
}

export async function adminModerate(reportId, payload) {
  const { data } = await api.post(`/admin/moderation/reports/${reportId}`, payload);
  return data.data;
}

export async function adminIssues({ page = 1, limit = 10, search = '', status = '', departmentId = '', priority = '' } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  if (status) params.status = status;
  if (departmentId) params.departmentId = departmentId;
  if (priority) params.priority = priority;
  const { data } = await api.get('/admin/issues', { params });
  const payload = data?.data;
  if (Array.isArray(payload)) {
    return { issues: payload, total: payload.length, page: 1, pages: 1, summary: null };
  }
  return {
    issues: Array.isArray(payload?.issues) ? payload.issues : [],
    total: Number(payload?.total) || 0,
    page: Number(payload?.page) || page,
    pages: Number(payload?.pages) || 0,
    summary: payload?.summary && typeof payload.summary === 'object' ? payload.summary : null,
  };
}

export async function adminMapIssues(params = {}) {
  const { data } = await api.get('/admin/map', { params });
  return data.data;
}

export async function adminOfficers() {
  const { data } = await api.get('/admin/officers');
  const payload = data?.data;
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.officers) ? payload.officers : [];
}

export async function adminIssuesReassign(issueId, officerId) {
  const { data } = await api.post(`/admin/issues/${issueId}/reassign`, { officer_id: officerId });
  return data.data;
}

export async function adminStatusOverride(issueId, status, note = '') {
  const { data } = await api.post(`/admin/issues/${issueId}/status`, { status, note });
  return data.data;
}

export async function adminUser(userId) {
  const { data } = await api.get(`/admin/users/${userId}`);
  return data.data;
}

export async function adminUpdateUser(userId, body) {
  const { data } = await api.patch(`/admin/users/${userId}`, body);
  return data.data;
}

export async function adminAssignRole(userId, role, departmentId = null) {
  const { data } = await api.post(`/admin/users/${userId}/roles`, { user_id: userId, role, department_id: departmentId });
  return data.data;
}

export async function adminToggleBan(userId) {
  const { data } = await api.patch(`/admin/users/${userId}/ban`);
  return data.data;
}

export async function adminSlaRules() {
  const { data } = await api.get('/admin/sla');
  return data.data.rules;
}

export async function adminUpdateSlaRule(ruleId, body) {
  const { data } = await api.patch(`/admin/sla/${ruleId}`, body);
  return data.data;
}

export async function adminUpdateCategory(categoryId, body) {
  const { data } = await api.patch(`/admin/categories/${categoryId}`, body);
  return data.data;
}

export async function analyticsFunnel() {
  const { data } = await api.get('/analytics/funnel');
  return data.data.funnel;
}

export async function analyticsOfficerPerformance() {
  const { data } = await api.get('/analytics/officers');
  return data.data.officers;
}

export async function analyticsSlaHealth() {
  const { data } = await api.get('/analytics/sla');
  return data.data;
}
