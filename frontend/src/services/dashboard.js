import api from './api';

export async function citizenDashboard() {
  const { data } = await api.get('/dashboard/me');
  return data.data;
}

export async function officerDashboard() {
  const { data } = await api.get('/dashboard/officer');
  return data.data;
}

export async function adminDashboard() {
  const { data } = await api.get('/dashboard/admin');
  return data.data;
}

export async function analyticsOverview() {
  const { data } = await api.get('/analytics/overview');
  return data.data;
}

export async function analyticsCategories() {
  const { data } = await api.get('/analytics/categories');
  return data.data;
}

export async function analyticsDepartments() {
  const { data } = await api.get('/analytics/departments');
  return data.data;
}

export async function analyticsLocations() {
  const { data } = await api.get('/analytics/locations');
  return data.data;
}