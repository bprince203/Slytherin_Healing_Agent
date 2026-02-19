import Link from 'next/link';

import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { historyRuns } from '@/lib/mockData';

export default function HistoryPage() {
  if (historyRuns.length === 0) {
    return <EmptyState title="No history yet" description="Your previous pipeline runs will show up here." />;
  }

  return (
    <section className="rounded-xl2 border border-border bg-card p-4 shadow-soft">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Past Runs</h1>
      <div className="space-y-3">
        {historyRuns.map((run) => (
          <Link
            key={run.id}
            href={`/run/${run.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-white/5"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{run.repo}</p>
              <p className="text-xs text-muted">{run.id} • {run.duration}</p>
            </div>
            <StatusBadge status={run.status} />
          </Link>
        ))}
      </div>
    </section>
  );
}
