import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

api.interceptors.response.use(
  (r) => r.data,
  (err) => Promise.reject(err.response?.data || err)
);

export const eventsApi = {
  getAll: (params) => api.get('/events', { params }),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getStats: () => api.get('/events/stats'),
};

export const trafficApi = {
  getLive: () => api.get('/traffic/live'),
  getSummary: () => api.get('/traffic/summary'),
  getByZone: (zone, params) => api.get(`/traffic/zone/${zone}`, { params }),
  getAll: (params) => api.get('/traffic', { params }),
};

export const predictionsApi = {
  getByEvent: (eventId) => api.get(`/predictions/event/${eventId}`),
  generate: (eventId) => api.post('/predictions/generate', { eventId }),
  simulate: (eventId, params = {}) => api.post('/predictions/simulate', { eventId, ...params }),
  getAll: () => api.get('/predictions'),
  updateResources: (predictionId, resourceAllocation) =>
    api.patch(`/predictions/${predictionId}/resources`, { resourceAllocation }),
};

export const alertsApi = {
  getAll: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  resolve: (id, data) => api.patch(`/alerts/${id}/resolve`, data),
  getStats: () => api.get('/alerts/stats'),
};

export default api;
