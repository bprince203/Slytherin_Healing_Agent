'use client';

import { useState } from 'react';
import { Github, LoaderCircle, PlayCircle, ScanSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { exampleRepos } from '@/lib/mockData';
import { saveLastRunId } from '@/lib/runSession';

export function RepoForm() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [repo, setRepo] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teamLeaderName, setTeamLeaderName] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [authorizeWrite, setAuthorizeWrite] = useState<boolean>(false);
  const [confirmRepoPermission, setConfirmRepoPermission] = useState<boolean>(false);
  const [runningMode, setRunningMode] = useState<'run-agent' | 'analyze-repository' | null>(null);

  const trimmedRepo = repo.trim();
  const trimmedTeamName = teamName.trim();
  const trimmedTeamLeaderName = teamLeaderName.trim();
  const trimmedGithubToken = githubToken.trim();

  const isValidGithubRepo = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(trimmedRepo);
  const canSubmit = isValidGithubRepo && trimmedTeamName.length > 0 && trimmedTeamLeaderName.length > 0;

  const handleRun = async (mode: 'run-agent' | 'analyze-repository') => {
    if (!trimmedRepo || !trimmedTeamName || !trimmedTeamLeaderName) {
      toast.error('Please fill repository, team name, and team leader name');
      return;
    }

    if (!isValidGithubRepo) {
      toast.error('Please enter a valid GitHub repository URL');
      return;
    }

    if (!isSignedIn) {
      router.push('/sign-in?redirect_url=%2Fdashboard');
      toast.message('Please login or register to run pipeline');
      return;
    }

    if (mode === 'run-agent' && (!authorizeWrite || !confirmRepoPermission)) {
      toast.error('Please confirm write authorization and repository write permission, or use Analyze Repository (read-only).');
      return;
    }

    setRunningMode(mode);

    try {
      const apiBase = process.env.NEXT_PUBLIC_AI_ENGINE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_url: trimmedRepo,
          team_name: trimmedTeamName,
          team_leader_name: trimmedTeamLeaderName,
          mode,
          authorize_write: mode === 'run-agent' ? authorizeWrite : false,
          github_token: mode === 'run-agent' && trimmedGithubToken ? trimmedGithubToken : undefined,
        }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { detail?: string };
          if (body?.detail) {
            detail = body.detail;
          }
        } catch {
          // Ignore body parse errors
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as { run_id?: string };
      const runId = data.run_id || 'run_1002';
      saveLastRunId(runId);

      toast.success(mode === 'run-agent' ? `Agent started for ${trimmedRepo}` : `Repository analysis started for ${trimmedRepo}`);
      router.push(`/run/${runId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const lowerMessage = message.toLowerCase();
      const isConnectivityError =
        lowerMessage.includes('failed to fetch') ||
        lowerMessage.includes('networkerror') ||
        lowerMessage.includes('network request failed');

      const isWriteAccessError =
        mode === 'run-agent' &&
        (lowerMessage.includes('write authorization') ||
          lowerMessage.includes('write permission') ||
          lowerMessage.includes('collaborator') ||
          lowerMessage.includes('github_token'));

      if (isWriteAccessError) {
        toast.error(`Run Agent blocked: ${message}`, {
          action: {
            label: 'Run Analyze Instead',
            onClick: () => handleRun('analyze-repository'),
          },
        });
        return;
      }

      toast.error(
        isConnectivityError
          ? 'Cannot reach AI engine backend at http://localhost:8000. Start backend first.'
          : `Unable to start run: ${message}`,
      );
    } finally {
      setRunningMode(null);
    }
  };

  return (
    <div className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <label className="mb-2 block text-sm font-medium text-foreground">GitHub repository URL</label>
      <div className="space-y-3">
        <div className="relative flex-1">
          <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 py-2 pl-9 pr-3 text-sm text-foreground outline-none ring-info/50 placeholder:text-muted focus:ring-2"
            placeholder="https://github.com/org/repo"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none ring-info/50 placeholder:text-muted focus:ring-2"
            placeholder="Team name (e.g., RIFT ORGANISERS)"
          />
          <input
            value={teamLeaderName}
            onChange={(event) => setTeamLeaderName(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none ring-info/50 placeholder:text-muted focus:ring-2"
            placeholder="Team leader name (e.g., Saiyam Kumar)"
          />
        </div>

        <input
          type="password"
          value={githubToken}
          onChange={(event) => setGithubToken(event.target.value)}
          className="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none ring-info/50 placeholder:text-muted focus:ring-2"
          placeholder="GitHub token (optional if backend .env has GITHUB_TOKEN)"
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={() => handleRun('run-agent')}
            disabled={runningMode !== null || !canSubmit}
            className="inline-flex items-center justify-center gap-2"
          >
            {runningMode === 'run-agent' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {runningMode === 'run-agent' ? 'Running agent…' : 'Run Agent'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleRun('analyze-repository')}
            disabled={runningMode !== null || !canSubmit}
            className="inline-flex items-center justify-center gap-2"
          >
            {runningMode === 'analyze-repository' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            {runningMode === 'analyze-repository' ? 'Analyzing…' : 'Analyze Repository'}
          </Button>
        </div>
        <label className="inline-flex items-start gap-2 rounded-lg border border-border bg-black/10 px-3 py-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={authorizeWrite}
            onChange={(event) => setAuthorizeWrite(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            I authorize write operations (branch/push/PR) for this run.
          </span>
        </label>
        <label className="inline-flex items-start gap-2 rounded-lg border border-border bg-black/10 px-3 py-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={confirmRepoPermission}
            onChange={(event) => setConfirmRepoPermission(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            I confirm this token/user has collaborator or write access to the repository.
          </span>
        </label>
        <p className="text-xs text-muted">Enter repository URL, team name, and team leader name to run the agent.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {exampleRepos.map((item) => (
          <button
            key={item}
            onClick={() => setRepo(item)}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
