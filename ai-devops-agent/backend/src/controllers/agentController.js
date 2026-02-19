import { enqueueJob, getQueueSize } from '../services/jobQueue.js';
import { buildResultPayload } from '../services/resultService.js';

export const runAgentJob = async (req, res) => {
  const payload = req.body || {};
  const jobId = `job_${Date.now()}`;
  enqueueJob({ jobId, payload, status: 'queued' });

  res.status(202).json({
    message: 'Agent job accepted',
    payload,
    jobId,
    queueSize: getQueueSize(),
  });
};

export const getAgentJob = async (req, res) => {
  const { id } = req.params;
  res.json({
    ...buildResultPayload(id, {
      status: 'queued',
      steps: [],
    }),
  });
};
