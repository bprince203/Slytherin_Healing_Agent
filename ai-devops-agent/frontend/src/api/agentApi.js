import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

export const startJob = (payload) => api.post('/agent/run', payload);
export const getJobStatus = (jobId) => api.get(`/agent/jobs/${jobId}`);

export default api;
