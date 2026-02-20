import { StatusBadge } from '@/components/StatusBadge';
import type { RunSummary, StepStatus } from '@/types';

interface RunSummaryCardProps {
  summary: RunSummary;
}

export function RunSummaryCard({ summary }: RunSummaryCardProps) {
  const status: StepStatus = summary.finalStatus === 'PASSED' ? 'success' : summary.finalStatus === 'RUNNING' ? 'running' : 'failed';

  return (
    <section className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <h2 className="text-lg font-semibold text-foreground">Run Summary</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Repository URL</p>
          <p className="mt-1 break-all text-sm text-foreground">{summary.repositoryUrl}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Team name</p>
          <p className="mt-1 text-sm text-foreground">{summary.teamName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Team leader</p>
          <p className="mt-1 text-sm text-foreground">{summary.teamLeaderName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Branch name created</p>
          <p className="mt-1 text-sm font-medium text-info">{summary.branchName}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Failures detected</p>
          <p className="mt-1 text-sm text-foreground">{summary.totalFailuresDetected}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Fixes applied</p>
          <p className="mt-1 text-sm text-foreground">{summary.totalFixesApplied}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Final CI/CD status</p>
          <div className="mt-1">
            <StatusBadge status={status} />
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Total time taken</p>
          <p className="mt-1 text-sm text-foreground">{summary.totalTimeTaken}</p>
        </div>
      </div>
    </section>
  );
}
