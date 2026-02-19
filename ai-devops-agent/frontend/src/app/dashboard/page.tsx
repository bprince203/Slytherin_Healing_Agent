import Link from 'next/link';

import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { metrics, recentRuns } from '@/lib/mockData';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </section>

      <section className="rounded-xl2 border border-border bg-card shadow-soft">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-foreground">Recent Runs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="px-4 py-3 font-medium">Run ID</th>
                <th className="px-4 py-3 font-medium">Repository</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-t border-border hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/run/${run.id}`} className="text-info hover:underline">
                      {run.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">{run.repo}</td>
                  <td className="px-4 py-3 text-muted">{run.branch}</td>
                  <td className="px-4 py-3 text-foreground">{run.duration}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
