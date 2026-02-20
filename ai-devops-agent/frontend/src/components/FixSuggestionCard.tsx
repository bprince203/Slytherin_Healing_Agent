import { memo } from 'react';
import { Copy, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';

import type { FixSuggestion } from '@/types';

interface FixSuggestionCardProps {
  item: FixSuggestion;
}

function getSnippetState(value: string | undefined) {
  const text = (value || '').trim();
  const lower = text.toLowerCase();
  const isMissing =
    !text ||
    lower === '(no original snippet captured)' ||
    lower === '(no updated snippet captured)' ||
    lower === '(no snippet captured)';
  return {
    isMissing,
    text: isMissing ? '' : text,
  };
}

function copyText(value: string) {
  navigator.clipboard.writeText(value);
  toast.success('Fix copied to clipboard');
}

function FixSuggestionCardComponent({ item }: FixSuggestionCardProps) {
  const before = getSnippetState(item.before);
  const after = getSnippetState(item.after);

  return (
    <article className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{item.file}</h4>
          <p className="mt-1 text-sm text-red-300">{item.error}</p>
        </div>
        <WandSparkles className="h-5 w-5 text-warning" />
      </div>
      <p className="mt-3 text-sm text-muted">{item.explanation}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-red-300">Before</p>
          {before.isMissing ? (
            <span className="inline-flex rounded-full border border-border px-2 py-1 text-[11px] text-muted">No snippet captured</span>
          ) : (
            <pre className="overflow-x-auto text-xs text-gray-200">{before.text}</pre>
          )}
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-emerald-300">After</p>
          {after.isMissing ? (
            <span className="inline-flex rounded-full border border-border px-2 py-1 text-[11px] text-muted">No snippet captured</span>
          ) : (
            <pre className="overflow-x-auto text-xs text-gray-200">{after.text}</pre>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => copyText(item.after)}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/5"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy fix
        </button>
      </div>
    </article>
  );
}

export const FixSuggestionCard = memo(FixSuggestionCardComponent);
