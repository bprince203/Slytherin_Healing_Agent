export const buildResultPayload = async (jobId, data) => {
  return { jobId, timestamp: new Date().toISOString(), data };
};
