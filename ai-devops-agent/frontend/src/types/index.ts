export type StepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface PipelineStep {
  id: string;
  name:
    | 'Clone Repo'
    | 'Install Dependencies'
    | 'Run Tests'
    | 'Detect Errors'
    | 'Generate Fix'
    | 'Apply Fix'
    | 'Re-run Tests'
    | 'Create Branch'
    | 'Done';
  status: StepStatus;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  detail?: string;
}

export interface RepoRun {
  id: string;
  repo: string;
  branch: string;
  status: StepStatus;
  startedAt: string;
  duration: string;
  testsPassed: boolean;
}

export interface MetricItem {
  label: string;
  value: string;
  hint?: string;
}

export interface LogLine {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  text: string;
  ts: string;
}

export interface FixSuggestion {
  id: string;
  file: string;
  error: string;
  explanation: string;
  before: string;
  after: string;
}

export interface RepoInfo {
  id: string;
  name: string;
  owner: string;
  defaultBranch: string;
  language: string;
  openIssues: number;
}
