import { RepoForm } from '@/components/RepoForm';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <section>
        <RepoForm />
      </section>
      <p className="text-sm text-muted">Start a run to view live pipeline summary, repository logs, and generated fixes from the AI engine.</p>
    </div>
  );
}
