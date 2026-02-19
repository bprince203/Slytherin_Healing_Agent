'use client';

import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PipelineTimeline } from '@/components/PipelineTimeline';
import { StepCard } from '@/components/StepCard';
import { pipelineSteps } from '@/lib/mockData';

const LogsViewer = lazy(() => import('@/components/LogsViewer').then((module) => ({ default: module.LogsViewer })));

interface ClientPageProps {
  runId: string;
}

export default function ClientPage({ runId }: ClientPageProps) {
  const allPassed = pipelineSteps.every((step) => step.status === 'success' || step.name === 'Done');

  const celebrate = () => {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.65 } });
    toast.success('Pipeline passed! 🎉');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Live Pipeline • {runId}</h1>
          <p className="text-sm text-muted">Mock stream of CI/CD + AI fix workflow</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast.success('Share link copied (mock)')}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-white/5"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share result
          </button>
          <button
            onClick={celebrate}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
          >
            Trigger success
          </button>
        </div>
      </div>

      <PipelineTimeline steps={pipelineSteps} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pipelineSteps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </section>

      <Suspense fallback={<LoadingSkeleton lines={8} />}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <LogsViewer />
        </motion.div>
      </Suspense>

      {allPassed ? (
        <button onClick={celebrate} className="rounded-lg border border-emerald-400/60 px-3 py-2 text-sm text-emerald-300">
          Celebrate pipeline success
        </button>
      ) : null}
    </div>
  );
}
