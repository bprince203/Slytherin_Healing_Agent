import type { RunSummary } from '@/types';

const STORAGE_KEY = 'ai_devops_run_summary';
const LAST_RUN_ID_KEY = 'ai_devops_last_run_id';

export function saveRunSummary(summary: RunSummary): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
}

export function loadRunSummary(): RunSummary | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as RunSummary;
  } catch {
    return null;
  }
}

export function saveLastRunId(runId: string): void {
  window.localStorage.setItem(LAST_RUN_ID_KEY, runId);
}

export function loadLastRunId(): string | null {
  return window.localStorage.getItem(LAST_RUN_ID_KEY);
}
