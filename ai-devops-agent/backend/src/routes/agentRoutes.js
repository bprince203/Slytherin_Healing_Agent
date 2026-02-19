import { Router } from 'express';
import { getAgentJob, runAgentJob } from '../controllers/agentController.js';

const router = Router();

router.post('/run', runAgentJob);
router.get('/jobs/:id', getAgentJob);

export default router;
