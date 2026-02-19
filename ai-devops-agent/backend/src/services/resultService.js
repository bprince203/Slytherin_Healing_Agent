export const buildResultPayload = (jobId, data = {}) => ({
  jobId,
  timestamp: new Date().toISOString(),
  data,
});