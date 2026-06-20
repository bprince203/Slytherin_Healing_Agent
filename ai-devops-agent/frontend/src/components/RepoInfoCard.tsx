import { memo } from 'react';
import { FolderGit2 } from 'lucide-react';

import type { RepoInfo } from '@/types';

interface RepoInfoCardProps {
  repo: RepoInfo;
}

function RepoInfoCardComponent({ repo }: RepoInfoCardProps) {
  return (
    <article className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <FolderGit2 className="h-5 w-5 text-info" />
        <h3 className="text-lg font-semibold text-foreground">Repo Info</h3>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Name</dt>
          <dd className="font-medium text-foreground">{repo.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Owner</dt>
          <dd className="font-medium text-foreground">{repo.owner}</dd>
        </div>
        <div>
          <dt className="text-muted">Default Branch</dt>
          <dd className="font-medium text-foreground">{repo.defaultBranch}</dd>
        </div>
        <div>
          <dt className="text-muted">Language</dt>
          <dd className="font-medium text-foreground">{repo.language}</dd>
        </div>
      </dl>
    </article>
  );
}

export const RepoInfoCard = memo(RepoInfoCardComponent);
