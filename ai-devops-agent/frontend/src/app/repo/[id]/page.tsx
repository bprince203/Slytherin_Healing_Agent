'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { FixSuggestionCard } from '@/components/FixSuggestionCard';
import { LogsViewer } from '@/components/LogsViewer';
import { RepoInfoCard } from '@/components/RepoInfoCard';
import { fixSuggestions, repoInfo } from '@/lib/mockData';

export default function RepoPage() {
  const copyBranchLink = async () => {
    const url = 'https://github.com/acme/inventory-api/tree/fix/ai/run-1002';
    await navigator.clipboard.writeText(url);
    toast.success('Branch link copied');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Repository Logs & Fixes</h1>
        <button
          onClick={copyBranchLink}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-white/5"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy GitHub branch link
        </button>
      </div>

      <RepoInfoCard repo={repoInfo} />
      <LogsViewer />

      <section className="space-y-3">
        {fixSuggestions.map((item) => (
          <FixSuggestionCard key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}
