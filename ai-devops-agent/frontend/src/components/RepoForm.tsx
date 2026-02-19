'use client';

import { useState } from 'react';
import { Github, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { exampleRepos } from '@/lib/mockData';

export function RepoForm() {
  const [repo, setRepo] = useState<string>(exampleRepos[0]);

  return (
    <div className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <label className="mb-2 block text-sm font-medium text-foreground">GitHub repository URL</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={repo}
            onChange={(event) => setRepo(event.target.value)}
            className="w-full rounded-lg border border-border bg-black/20 py-2 pl-9 pr-3 text-sm text-foreground outline-none ring-info/50 placeholder:text-muted focus:ring-2"
            placeholder="https://github.com/org/repo"
          />
        </div>
        <Button
          onClick={() => toast.success(`Mock pipeline started for ${repo}`)}
          className="inline-flex items-center justify-center gap-2"
        >
          <PlayCircle className="h-4 w-4" />
          Run pipeline
        </Button>
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
