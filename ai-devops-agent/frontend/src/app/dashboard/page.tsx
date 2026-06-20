'use client';

import { useEffect, useState } from 'react';
import { RepoForm } from '@/components/RepoForm';
import { useUser, useReverification } from '@clerk/nextjs';
import { Github, CheckCircle2 } from 'lucide-react';

type GithubRepo = {
  full_name: string;
  html_url: string;
  private: boolean;
  updated_at: string;
};

export default function DashboardPage() {
  const { user } = useUser();
  const [userRepos, setUserRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const isGithubConnected = user?.externalAccounts?.some(
    (acc) => acc.provider === 'github'
  );

  // ✅ No destructuring — useReverification returns the function directly
  const createExternalAccountWithVerification = useReverification(
    async () =>
      await user?.createExternalAccount({
        strategy: 'oauth_github',
        redirectUrl: '/dashboard',
        additionalScopes: ['repo', 'read:user'],
      })
  );

  const connectGithub = async () => {
    try {
      const externalAccount = await createExternalAccountWithVerification();
      const redirectUrl =
        externalAccount?.verification?.externalVerificationRedirectURL;
      if (redirectUrl) {
        window.location.href = redirectUrl.href;
      }
    } catch (err) {
      console.error('GitHub connect failed:', err);
    }
  };

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
            <button
              onClick={connectGithub}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-black/20 px-4 py-2 text-sm font-medium text-foreground hover:bg-black/40 transition"
            >
              <Github className="h-4 w-4" />
              Connect GitHub to Enable PR Agent
            </button>
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
