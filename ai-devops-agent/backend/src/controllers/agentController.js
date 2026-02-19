export const runAgentJob = async (req, res) => {
  const payload = req.body || {};
  res.status(202).json({
    message: 'Agent job accepted',
    payload,
    jobId: `job_${Date.now()}`,
  });
};

export const getAgentJob = async (req, res) => {
  const { id } = req.params;
  res.json({
    jobId: id,
    status: 'queued',
    steps: [],
  });
};
