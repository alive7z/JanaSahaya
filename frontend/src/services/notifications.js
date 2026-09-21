import api from './api';

export async function fetchNotifications(page = 1) {
  const { data } = await api.get('/notifications', { params: { page } });
  return data.data;
}

export async function markNotificationRead(id) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.post('/notifications/mark-all-read');
}

export async function fetchUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.data.count;
}