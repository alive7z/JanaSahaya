import api from './api';

export async function fetchIssues(params = {}) {
  const { data } = await api.get('/issues', { params });
  return data.data;
}

export async function fetchIssue(id) {
  const { data } = await api.get(`/issues/${id}`);
  return data.data;
}

export async function createIssue(payload) {
  const { images = [], ...body } = payload;
  const form = new FormData();
  Object.entries(body).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  images.forEach((file) => form.append('images', file));
  const { data } = await api.post('/issues', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function checkDuplicates(payload, { silent = false } = {}) {
  const { data } = await api.post('/issues/check-duplicates', payload, {
    skipErrorHandler: silent,
  });
  return data.data;
}

export async function vote(issueId, { remove = false } = {}) {
  const { data } = remove
    ? await api.delete(`/issues/${issueId}/vote`)
    : await api.post(`/issues/${issueId}/vote`);
  return data.data;
}

export async function follow(issueId, { remove = false } = {}) {
  const { data } = remove
    ? await api.delete(`/issues/${issueId}/follow`)
    : await api.post(`/issues/${issueId}/follow`);
  return data.data;
}

export async function fetchComments(issueId) {
  const { data } = await api.get(`/issues/${issueId}/comments`);
  return data.data.comments;
}

export async function addComment(issueId, content, parentId = null) {
  const { data } = await api.post(`/issues/${issueId}/comments`, {
    content,
    parent_id: parentId,
  });
  return data.data;
}

export async function editComment(issueId, commentId, content) {
  const { data } = await api.patch(`/issues/${issueId}/comments/${commentId}`, { content });
  return data.data;
}

export async function deleteComment(issueId, commentId) {
  await api.delete(`/issues/${issueId}/comments/${commentId}`);
}

export async function reportComment(issueId, commentId, reason) {
  const { data } = await api.post(`/issues/${issueId}/comments/${commentId}/report`, { reason });
  return data.data;
}

export async function verifyResolution(issueId, confirmed) {
  const { data } = await api.post(`/issues/${issueId}/verify`, { confirmed });
  return data.data;
}

export async function acceptIssue(issueId) {
  const { data } = await api.patch(`/issues/${issueId}/accept`);
  return data.data;
}

export async function resolveIssue(issueId, { note, evidence }) {
  const form = new FormData();
  form.append('note', note);
  (evidence || []).forEach((file) => form.append('evidence', file));
  const { data } = await api.post(`/issues/${issueId}/resolve`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function changeStatus(issueId, status, note = '') {
  const { data } = await api.patch(`/issues/${issueId}/status`, { status, note });
  return data.data;
}

export async function fetchNearby({ lat, lng, distance = 1000 }) {
  const { data } = await api.get('/issues/nearby', { params: { lat, lng, distance } });
  return data.data;
}

export async function fetchMyIssues(tab = 'reported') {
  const { data } = await api.get('/issues/my', { params: { tab } });
  return data.data;
}

export async function fetchPriorityHistory(issueId) {
  const { data } = await api.get(`/dashboard/issues/${issueId}/priority`);
  return data.data.history;
}