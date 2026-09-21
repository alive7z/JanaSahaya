import api from './api';

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data.data;
}

export async function login(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('accessToken');
  }
}

export async function me() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function updateProfile(payload) {
  const { data } = await api.patch('/auth/me', payload);
  return data.data;
}

export async function changePassword(payload) {
  const { data } = await api.patch('/auth/me/password', payload);
  return data.data;
}