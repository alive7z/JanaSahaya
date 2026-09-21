import axios from 'axios';
import { API_URL } from '../constants';
import { initSocket } from './socket';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Attempt one refresh when access token expires.
    const isSessionMutation = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']
      .some((path) => original.url?.includes(path));
    if (status === 401 && original && !original._retry && !isSessionMutation) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
            .then(({ data }) => data.data.accessToken)
            .finally(() => { refreshPromise = null; });
        }
        const accessToken = await refreshPromise;
        localStorage.setItem('accessToken', accessToken);
        initSocket(accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error, fallback = 'Something went wrong') {
  const errors = error?.response?.data?.errors;
  if (Array.isArray(errors) && errors.length) {
    return errors.map((e) => e.message).filter(Boolean).join(', ');
  }
  return error?.response?.data?.message || error?.message || fallback;
}

export default api;
