'use client';

import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { LoaderCircle, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FixSuggestionCard } from '@/components/FixSuggestionCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { LogsViewer } from '@/components/LogsViewer';
import { PipelineTimeline } from '@/components/PipelineTimeline';
import { RunSummaryCard } from '@/components/RunSummaryCard';
import { StepCard } from '@/components/StepCard';
import { defaultRunSummary } from '@/lib/mockData';
import { saveLastRunId } from '@/lib/runSession';
import type { FixSuggestion, LogLine, PipelineStep, RunSummary, StepStatus } from '@/types';

interface ClientPageProps {
  runId: string;
}

interface BackendRunResponse {
  mode?: 'run-agent' | 'analyze-repository' | string;
  repository_url?: string;
  team_name?: string;
  team_leader_name?: string;
  pr_url?: string;
  branch_name?: string;
  total_failures_detected?: number;
  total_fixes_applied?: number;
  final_status?: 'PASSED' | 'FAILED' | 'RUNNING' | string;
  started_at?: string;
  finished_at?: string;
  total_time_taken?: string;
  ci_timeline?: Array<{ name?: string; status?: string; detail?: string }>;
  logs?: Array<{ ts?: string; level?: string; text?: string }>;
  fixes?: Array<{ file?: string; error?: string; explanation?: string; before?: string; after?: string }>;
  results_json?: {
    run_summary?: Record<string, unknown>;
    score_breakdown?: {
      base_score?: number;
      speed_bonus?: number;
      efficiency_penalty?: number;
      final_score?: number;
      total_commits?: number;
    };
    agent_output?: string[];
    fixes?: Array<Record<string, unknown>>;
  };
}

function normalizeStatus(value?: string): StepStatus {
  const text = (value || '').toLowerCase();
  if (text === 'success' || text === 'passed') return 'success';
  if (text === 'failed' || text === 'error') return 'failed';
  if (text === 'running' || text === 'in_progress') return 'running';
  return 'pending';
}

function buildSummary(data: BackendRunResponse): RunSummary {
  const status = (data.final_status || 'FAILED').toUpperCase();
  const mode = (data.mode || defaultRunSummary.mode).toString().toLowerCase() === 'run-agent' ? 'run-agent' : 'analyze-repository';
  return {
    repositoryUrl: data.repository_url || defaultRunSummary.repositoryUrl,
    teamName: data.team_name || defaultRunSummary.teamName,
    teamLeaderName: data.team_leader_name || defaultRunSummary.teamLeaderName,
    branchName: data.branch_name || defaultRunSummary.branchName,
    totalFailuresDetected: data.total_failures_detected ?? defaultRunSummary.totalFailuresDetected,
    totalFixesApplied: data.total_fixes_applied ?? defaultRunSummary.totalFixesApplied,
    finalStatus: status === 'PASSED' ? 'PASSED' : status === 'RUNNING' ? 'RUNNING' : 'FAILED',
    startedAtIso: data.started_at || defaultRunSummary.startedAtIso,
    finishedAtIso: data.finished_at || defaultRunSummary.finishedAtIso,
    totalTimeTaken: data.total_time_taken || defaultRunSummary.totalTimeTaken,
    mode,
  };
}

function buildSteps(data: BackendRunResponse): PipelineStep[] {
  const items = data.ci_timeline || [];
  return items.map((item, index) => ({
    id: `s_${index}`,
    name: (item.name as PipelineStep['name']) || 'Run Tests',
    status: normalizeStatus(item.status),
    detail: item.detail,
  }));
}

function buildLogs(data: BackendRunResponse): LogLine[] {
  const items = data.logs || [];
  return items.map((item, index) => ({
    id: `l_${index}`,
    ts: item.ts || new Date().toLocaleTimeString(),
    level: (item.level as LogLine['level']) || 'info',
    text: item.text || '',
  }));
}

function buildFixes(data: BackendRunResponse): FixSuggestion[] {
  const items = data.fixes || [];
  return items.map((item, index) => ({
    id: `f_${index}`,
    file: item.file || 'unknown',
    error: item.error || 'Unknown issue',
    explanation: item.explanation || 'No explanation provided by backend',
    before: item.before || '',
    after: item.after || '',
  }));
}

export default function ClientPage({ runId }: ClientPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [runData, setRunData] = useState<BackendRunResponse | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isPromotingToRunAgent, setIsPromotingToRunAgent] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_AI_ENGINE_API_URL || 'http://localhost:8000';
    let pollId: number | undefined;

    const fetchRun = async () => {
      try {
        const response = await fetch(`${apiBase}/api/run/${runId}`);
        if (!response.ok) throw new Error('Failed to fetch run data');
        const data = (await response.json()) as BackendRunResponse;
        setRunData(data);
        setFetchError(null);

        const status = (data.final_status || '').toUpperCase();
        if (status && status !== 'RUNNING' && pollId) {
          window.clearInterval(pollId);
        }
      } catch {
        setFetchError('Unable to fetch live run data from AI engine');
      } finally {
        setLoading(false);
      }
    };

    fetchRun();
    pollId = window.setInterval(fetchRun, 3000);
    return () => {
      if (pollId) window.clearInterval(pollId);
    };
  }, [runId]);

  const summary = useMemo(() => (runData ? buildSummary(runData) : defaultRunSummary), [runData]);
  const steps = useMemo(() => (runData ? buildSteps(runData) : []), [runData]);
  const logs = useMemo(() => (runData ? buildLogs(runData) : []), [runData]);
  const fixes = useMemo(() => (runData ? buildFixes(runData) : []), [runData]);

  const isRunning = (runData?.final_status || '').toUpperCase() === 'RUNNING';
  const allPassed = summary.finalStatus === 'PASSED';
  const isAnalyzeMode = (runData?.mode || '').toLowerCase() === 'analyze-repository';

  const runAgentFromAnalysis = async () => {
    if (!runData?.repository_url || !runData?.team_name || !runData?.team_leader_name) {
      toast.error('Cannot start Run Agent: missing run context');
      return;
    }

    const token = window.prompt('Enter GitHub token for write mode (required to raise PR):')?.trim();
    if (!token) {
      toast.error('Run Agent requires a GitHub token for write mode.');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_AI_ENGINE_API_URL || 'http://localhost:8000';
    setIsPromotingToRunAgent(true);
    try {
      const response = await fetch(`${apiBase}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_url: runData.repository_url,
          team_name: runData.team_name,
          team_leader_name: runData.team_leader_name,
          mode: 'run-agent',
          authorize_write: true,
          github_token: token,
        }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { detail?: string };
          if (body?.detail) detail = body.detail;
        } catch {
          // ignore parse errors
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as { run_id?: string };
      if (!data.run_id) throw new Error('Missing run id from backend');

      saveLastRunId(data.run_id);
      toast.success('Run Agent started. PR will be raised if fixes are applied and permissions are valid.');
      router.push(`/run/${data.run_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Unable to start Run Agent: ${message}`);
    } finally {
      setIsPromotingToRunAgent(false);
    }
  };

  const restartRun = async () => {
    if (!runData?.repository_url || !runData?.team_name || !runData?.team_leader_name) {
      toast.error('Cannot restart: missing run context');
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_AI_ENGINE_API_URL || 'http://localhost:8000';
    const currentMode = (runData.mode || 'analyze-repository').toString();
    const restartMode = currentMode === 'run-agent' ? 'run-agent' : 'analyze-repository';

    setIsRestarting(true);
    try {
      const response = await fetch(`${apiBase}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_url: runData.repository_url,
          team_name: runData.team_name,
          team_leader_name: runData.team_leader_name,
          mode: restartMode,
          authorize_write: restartMode === 'run-agent',
        }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { detail?: string };
          if (body?.detail) detail = body.detail;
        } catch {
          // ignore parse errors
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as { run_id?: string };
      if (!data.run_id) throw new Error('Missing run id from backend');

      saveLastRunId(data.run_id);
      toast.success('Restarted run successfully');
      router.push(`/run/${data.run_id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const requiresWriteToken = message.toLowerCase().includes('token') || message.toLowerCase().includes('write mode');

      if (requiresWriteToken) {
        toast.error('Restart in write mode requires token. Use Test New Repo to enter token and rerun.');
      } else {
        toast.error(`Unable to restart run: ${message}`);
      }
    } finally {
      setIsRestarting(false);
    }
  };

  const celebrate = () => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 } });
    toast.success('Pipeline passed! 🎉');
  };

  if (loading) return <LoadingSkeleton lines={10} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Live Pipeline • {runId}</h1>
          {isRunning ? (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-info">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Agent is running...
            </p>
          ) : null}
        </div>
        <button
          onClick={() => toast.success('Share link copied (mock)')}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-white/5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share result
        </button>
      </div>

      {fetchError ? <p className="text-xs text-red-300">{fetchError}</p> : null}

      {isAnalyzeMode ? (
        <p className="text-xs text-muted">
          Analyze mode runs detection and fix simulation in an isolated workspace; branch push and PR creation are skipped until you run agent in write mode.
        </p>
      ) : null}

      {runData?.pr_url ? (
        <section className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
          <p className="text-xs font-medium text-emerald-300">PR raised successfully</p>
          <a href={runData.pr_url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs text-info hover:underline">
            {runData.pr_url}
          </a>
        </section>
      ) : null}

      {!isRunning ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={restartRun}
            disabled={isRestarting}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRestarting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
            {isRestarting ? 'Restarting…' : 'Restart Test'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-white/5"
          >
            Test New Repo
          </button>
          {isAnalyzeMode ? (
            <button
              onClick={runAgentFromAnalysis}
              disabled={isPromotingToRunAgent}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPromotingToRunAgent ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
              {isPromotingToRunAgent ? 'Starting Run Agent…' : 'Run Agent & Raise PR'}
            </button>
          ) : null}
        </div>
      ) : null}

      <RunSummaryCard summary={summary} />

      <PipelineTimeline steps={steps} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </section>

      <LogsViewer runId={runId} externalLogs={logs} />

      <section className="space-y-3">
        {fixes.map((item) => (
          <FixSuggestionCard key={item.id} item={item} />
        ))}
      </section>

      {runData?.results_json ? (
        <section className="rounded-xl2 border border-border bg-card p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground">Results.json Integration</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Base Score</p>
              <p className="mt-1 text-sm text-foreground">{runData.results_json.score_breakdown?.base_score ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Speed Bonus</p>
              <p className="mt-1 text-sm text-foreground">{runData.results_json.score_breakdown?.speed_bonus ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Final Score</p>
              <p className="mt-1 text-sm text-foreground">{runData.results_json.score_breakdown?.final_score ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Total Commits</p>
              <p className="mt-1 text-sm text-foreground">{runData.results_json.score_breakdown?.total_commits ?? '-'}</p>
            </div>
          </div>

          {runData.results_json.agent_output?.length ? (
            <div className="mt-3 rounded-lg border border-border/70 bg-black/20 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted">Agent Output</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {runData.results_json.agent_output.map((line, idx) => (
                  <li key={`${runId}_agent_${idx}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="mt-3 rounded-lg border border-border/70 bg-black/20 p-3">
            <summary className="cursor-pointer text-xs font-medium text-foreground">Raw payload</summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded bg-black/30 p-3 text-xs text-slate-300">
              {JSON.stringify(runData.results_json, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}

      {allPassed ? (
        <button onClick={celebrate} className="rounded-lg border border-emerald-400/60 px-3 py-2 text-sm text-emerald-300">
          Celebrate pipeline success
        </button>
      ) : null}
    </div>
  );
}
