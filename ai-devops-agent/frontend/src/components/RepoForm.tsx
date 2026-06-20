'use client';

import { useState } from 'react';
import { ChevronDown, Github, LoaderCircle, PlayCircle, ScanSearch, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { exampleRepos } from '@/lib/mockData';
import { saveLastRunId } from '@/lib/runSession';

type GithubRepo = {
  full_name: string;
  html_url: string;
  private: boolean;
  updated_at: string;
};

type RepoFormProps = {
  userRepos?: GithubRepo[];
  loadingRepos?: boolean;
};

export function RepoForm({ userRepos = [], loadingRepos = false }: RepoFormProps) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const { user } = useUser();
  const [repo, setRepo] = useState<string>('');
  const [authorizeWrite, setAuthorizeWrite] = useState<boolean>(false);
  const [confirmRepoPermission, setConfirmRepoPermission] = useState<boolean>(false);
  const [runningMode, setRunningMode] = useState<'run-agent' | 'analyze-repository' | null>(null);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [supportBanner, setSupportBanner] = useState<string | null>(null);

  const trimmedRepo = repo.trim();
  const isGithubConnected = Boolean(user?.externalAccounts?.some((account) => account.provider === 'github'));

  const isValidGithubRepo = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i.test(trimmedRepo);
  const canSubmit = isValidGithubRepo;

  const raiseSupportBanner = (message: string) => {
    setSupportBanner(message);
  };

  const openGithubConnection = () => {
    clerk.openUserProfile({});
  };

  const fetchGithubToken = async () => {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('GitHub connection is not ready');
    }

    const data = (await response.json()) as { githubToken?: string | null };
    return (data.githubToken || '').trim();
  };

  const onGithubCheckboxChange = () => {
    if (!isGithubConnected) {
      raiseSupportBanner('GitHub is not connected yet. Open your profile, connect GitHub, and the box will check itself.');
      openGithubConnection();
    }
  };

  const onWriteCheckboxChange = () => {
    if (!isGithubConnected) {
      raiseSupportBanner('Connect GitHub first, then approve write mode for this repository.');
      openGithubConnection();
      setAuthorizeWrite(false);
      setConfirmRepoPermission(false);
      return;
    }

    setAuthorizeWrite((value) => !value);
    setConfirmRepoPermission((value) => !value);
    setSupportBanner(null);
  };

  const handleRun = async (mode: 'run-agent' | 'analyze-repository') => {
    if (!trimmedRepo) {
      toast.error('Please fill repository URL');
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

    if (mode === 'run-agent') {
      if (!isGithubConnected) {
        raiseSupportBanner(
          'GitHub is not connected yet. Open your profile, connect GitHub, and then try write mode again.'
        );
        openGithubConnection();
        toast.error('Connect GitHub to enable write mode.');
        return;
      }

      if (!authorizeWrite || !confirmRepoPermission) {
        raiseSupportBanner(
          'Check both write-mode boxes to continue.'
        );
        toast.error('Write mode needs both confirmations.');
        return;
      }
    }

    setRunningMode(mode);

    try {
      const githubToken = mode === 'run-agent' ? await fetchGithubToken() : undefined;
      const apiBase = process.env.NEXT_PUBLIC_AI_ENGINE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_url: trimmedRepo,
          mode,
          authorize_write: mode === 'run-agent',
          github_token: githubToken,
        }),
      });

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { detail?: string };
          if (body?.detail) detail = body.detail;
        } catch {
          // ignore
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as { run_id?: string };
      const runId = data.run_id || 'run_1002';
      saveLastRunId(runId);

      toast.success(
        mode === 'run-agent'
          ? `Agent started for ${trimmedRepo}`
          : `Repository analysis started for ${trimmedRepo}`
      );
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
          lowerMessage.includes('authorization') ||
          lowerMessage.includes('access'));

      if (isWriteAccessError) {
        setAuthorizeWrite(false);
        setConfirmRepoPermission(false);
        raiseSupportBanner(
          'GitHub write access is not ready yet. Open your profile, connect the account with repo access, and check both boxes again.'
        );
        toast.error(`Run Agent blocked: ${message}`);
        return;
      }

      toast.error(
        isConnectivityError
          ? 'Cannot reach AI engine backend at http://localhost:8000. Start backend first.'
          : `Unable to start run: ${message}`
      );
    } finally {
      setRunningMode(null);
    }
  };

  return (
    <div className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <label className="mb-2 block text-sm font-medium text-foreground">GitHub repository URL</label>
      <div className="space-y-3">
        {supportBanner ? (
          <section className="rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-400/15 via-orange-400/10 to-pink-400/15 p-4 text-amber-50 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-300/20 p-2 text-amber-200">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-amber-100">GitHub connection needed</h3>
                <p className="text-sm leading-6 text-amber-50/90">{supportBanner}</p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full rounded-lg border border-border bg-black/20 py-2 pl-9 pr-3 text-sm text-foreground outline-none ring-info/50 placeholder:text-muted focus:ring-2"
              placeholder="https://github.com/org/repo"
            />
          </div>

          {userRepos.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowRepoDropdown((v) => !v)}
                className="inline-flex h-full items-center gap-1.5 rounded-lg border border-border bg-black/20 px-3 py-2 text-sm text-foreground hover:bg-black/40 transition whitespace-nowrap"
              >
                <Github className="h-4 w-4" />
                Import
                <ChevronDown className="h-3 w-3 text-muted" />
              </button>

              {showRepoDropdown && (
                <div className="absolute right-0 z-50 mt-1 max-h-64 w-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {userRepos.map((r) => (
                    <button
                      key={r.html_url}
                      onClick={() => {
                        setRepo(r.html_url);
                        setShowRepoDropdown(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/20"
                    >
                      <span className="truncate text-foreground">{r.full_name}</span>
                      {r.private && (
                        <span className="ml-2 shrink-0 rounded-full border border-border px-1.5 py-0.5 text-xs text-muted">
                          Private
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loadingRepos && (
            <div className="flex items-center px-2">
              <LoaderCircle className="h-4 w-4 animate-spin text-muted" />
            </div>
          )}
        </div>

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

        <button
          type="button"
          onClick={onGithubCheckboxChange}
          className="inline-flex items-start gap-2 rounded-lg border border-border bg-black/10 px-3 py-2 text-left text-xs text-muted hover:bg-black/20"
        >
          <input
            type="checkbox"
            checked={isGithubConnected}
            readOnly
            className="mt-0.5"
          />
          <span>GitHub connected for write mode</span>
        </button>
        <button
          type="button"
          onClick={onWriteCheckboxChange}
          className="inline-flex items-start gap-2 rounded-lg border border-border bg-black/10 px-3 py-2 text-left text-xs text-muted hover:bg-black/20"
        >
          <input
            type="checkbox"
            checked={authorizeWrite && confirmRepoPermission}
            readOnly
            className="mt-0.5"
          />
          <span>I allow this run to write to the selected repository.</span>
        </button>

        <p className="text-xs text-muted">
          Run Agent will open your GitHub profile if connection is missing, then use that connected account for write mode.
        </p>

        <p className="text-xs text-muted">Enter a repository URL to run the agent or analyze the repo in read-only mode.</p>
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
