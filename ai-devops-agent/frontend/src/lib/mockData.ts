import type { FixSuggestion, LogLine, MetricItem, PipelineStep, RepoInfo, RepoRun } from '@/types';

export const exampleRepos: string[] = [
  'https://github.com/vercel/next.js',
  'https://github.com/facebook/react',
  'https://github.com/langchain-ai/langgraph',
];

export const metrics: MetricItem[] = [
  { label: 'Total runs', value: '1,248', hint: '+12% this week' },
  { label: 'Success rate', value: '92.4%', hint: 'Healthy pipelines' },
  { label: 'Failed repos', value: '73', hint: 'Need attention' },
  { label: 'Avg runtime', value: '4m 12s', hint: 'Across all runs' },
  { label: 'Last run', value: '2m ago', hint: 'acme/checkout-service' },
];

export const recentRuns: RepoRun[] = [
  {
    id: 'run_1001',
    repo: 'acme/checkout-service',
    branch: 'fix/ai/run-1001',
    status: 'success',
    startedAt: '2026-02-19T08:20:00Z',
    duration: '3m 41s',
    testsPassed: true,
  },
  {
    id: 'run_1002',
    repo: 'acme/inventory-api',
    branch: 'fix/ai/run-1002',
    status: 'running',
    startedAt: '2026-02-19T08:29:00Z',
    duration: '2m 03s',
    testsPassed: false,
  },
  {
    id: 'run_1003',
    repo: 'acme/payments-gateway',
    branch: 'fix/ai/run-1003',
    status: 'failed',
    startedAt: '2026-02-19T07:56:00Z',
    duration: '5m 59s',
    testsPassed: false,
  },
];

export const pipelineSteps: PipelineStep[] = [
  { id: 's1', name: 'Clone Repo', status: 'success', durationMs: 900, detail: 'Repository cloned to sandbox.' },
  { id: 's2', name: 'Install Dependencies', status: 'success', durationMs: 2100, detail: 'npm install completed.' },
  { id: 's3', name: 'Run Tests', status: 'failed', durationMs: 1800, detail: '2 tests failed in checkout.spec.ts.' },
  { id: 's4', name: 'Detect Errors', status: 'success', durationMs: 800, detail: 'Detected null reference and syntax mismatch.' },
  { id: 's5', name: 'Generate Fix', status: 'success', durationMs: 1100, detail: 'Generated patch suggestions.' },
  { id: 's6', name: 'Apply Fix', status: 'success', durationMs: 700, detail: 'Applied patch to branch.' },
  { id: 's7', name: 'Re-run Tests', status: 'running', durationMs: 1200, detail: 'Streaming test logs…' },
  { id: 's8', name: 'Create Branch', status: 'pending', detail: 'Pending test success.' },
  { id: 's9', name: 'Done', status: 'pending', detail: 'Awaiting pipeline completion.' },
];

export const mockLogs: LogLine[] = [
  { id: 'l1', level: 'info', ts: '08:29:11', text: '[clone] Cloned acme/inventory-api@main' },
  { id: 'l2', level: 'info', ts: '08:29:18', text: '[deps] Installing dependencies...' },
  { id: 'l3', level: 'success', ts: '08:29:25', text: '[deps] Dependencies installed successfully' },
  { id: 'l4', level: 'info', ts: '08:29:31', text: '[test] Running unit tests (Jest)' },
  { id: 'l5', level: 'error', ts: '08:29:38', text: "TypeError: Cannot read properties of undefined (reading 'total')" },
  { id: 'l6', level: 'warn', ts: '08:29:39', text: '[ai] Detecting probable root causes...' },
  { id: 'l7', level: 'success', ts: '08:29:45', text: '[ai] Generated patch for src/cart/calc.ts' },
  { id: 'l8', level: 'info', ts: '08:29:51', text: '[test] Re-running test suite...' },
];

export const fixSuggestions: FixSuggestion[] = [
  {
    id: 'fix_01',
    file: 'src/cart/calc.ts',
    error: "TypeError: Cannot read properties of undefined (reading 'total')",
    explanation:
      'The function assumed that cart.items always exists. Added a defensive fallback and default accumulator to prevent null access.',
    before: 'export const sum = (cart) => cart.items.reduce((n, i) => n + i.total, 0);',
    after: 'export const sum = (cart) => (cart?.items ?? []).reduce((n, i) => n + (i.total ?? 0), 0);',
  },
  {
    id: 'fix_02',
    file: 'src/api/client.ts',
    error: 'SyntaxError: Unexpected token )',
    explanation: 'Removed an extra closing parenthesis in request wrapper and aligned return statement.',
    before: 'return fetch(url, options));',
    after: 'return fetch(url, options);',
  },
];

export const repoInfo: RepoInfo = {
  id: 'repo_001',
  name: 'inventory-api',
  owner: 'acme',
  defaultBranch: 'main',
  language: 'TypeScript',
  openIssues: 14,
};

export const historyRuns: RepoRun[] = [
  ...recentRuns,
  {
    id: 'run_0997',
    repo: 'acme/auth-service',
    branch: 'fix/ai/run-0997',
    status: 'success',
    startedAt: '2026-02-18T22:04:00Z',
    duration: '2m 21s',
    testsPassed: true,
  },
  {
    id: 'run_0996',
    repo: 'acme/shipping-worker',
    branch: 'fix/ai/run-0996',
    status: 'failed',
    startedAt: '2026-02-18T21:10:00Z',
    duration: '6m 14s',
    testsPassed: false,
  },
];
