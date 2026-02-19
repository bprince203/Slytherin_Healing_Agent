import express from 'express';
import cors from 'cors';
import agentRoutes from './routes/agentRoutes.js';
import { env } from './config/env.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/agent', agentRoutes);

app.listen(env.port, () => {
  console.log(`Express backend running on port ${env.port}`);
});
