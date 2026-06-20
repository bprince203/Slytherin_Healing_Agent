'use client';

import { useEffect, useState } from 'react';
import { RepoForm } from '@/components/RepoForm';
import { useClerk, useUser } from '@clerk/nextjs';
import { CheckCircle2 } from 'lucide-react';

type GithubRepo = {
  full_name: string;
  html_url: string;
  private: boolean;
  updated_at: string;
};

export default function DashboardPage() {
  const clerk = useClerk();
  const { user } = useUser();
  const [userRepos, setUserRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const isGithubConnected = user?.externalAccounts?.some(
    (acc) => acc.provider === 'github'
  );

  useEffect(() => {
    if (!isGithubConnected) return;
    setLoadingRepos(true);
    fetch('/api/github/repos')
      .then((r) => r.json())
      .then((data) => setUserRepos(data.repos ?? []))
      .catch(() => setUserRepos([]))
      .finally(() => setLoadingRepos(false));
  }, [isGithubConnected]);

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-4">
          {isGithubConnected ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>GitHub Connected</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted">
                GitHub is not connected yet. Open your profile to connect it and unlock repo import and write mode.
              </p>
              <button
                type="button"
                onClick={() => clerk.openUserProfile({})}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-white/5"
              >
                Connect GitHub
              </button>
            </div>
          )}
        </div>
        <RepoForm userRepos={userRepos} loadingRepos={loadingRepos} />
      </section>
      <p className="text-sm text-muted">
        Start a run to view live pipeline summary, repository logs, and generated fixes from the AI engine.
      </p>
    </div>
  );
}
