import api from './api';

export async function fetchMeta() {
  const { data } = await api.get('/meta');
  return data.data;
}

export async function fetchHeatmap() {
  const { data } = await api.get('/meta/heatmap');
  return data.data.points;
}