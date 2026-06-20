'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Check, CircleDashed, LoaderCircle, XCircle } from 'lucide-react';

import { StatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import type { PipelineStep, StepStatus } from '@/types';

interface PipelineTimelineProps {
  steps: PipelineStep[];
}

const lineClass: Record<StepStatus, string> = {
  pending: 'bg-gray-700',
  running: 'bg-blue-500',
  success: 'bg-emerald-500',
  failed: 'bg-red-500',
};

const iconFor = (status: StepStatus) => {
  if (status === 'success') return <Check className="h-3.5 w-3.5" />;
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5" />;
  if (status === 'running') return <LoaderCircle className="h-3.5 w-3.5 animate-spin" />;
  return <CircleDashed className="h-3.5 w-3.5" />;
};

function PipelineTimelineComponent({ steps }: PipelineTimelineProps) {
  return (
    <section className="rounded-xl2 border border-border bg-card p-5 shadow-soft">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Pipeline Timeline</h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative pl-8"
          >
            <span
              className={cn(
                'absolute left-0 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-white',
                lineClass[step.status],
              )}
            >
              {iconFor(step.status)}
            </span>
            {index < steps.length - 1 ? (
              <span className={cn('absolute left-2.5 top-6 h-8 w-px', lineClass[step.status])} />
            ) : null}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-black/20 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{step.name}</p>
                {step.detail ? <p className="text-xs text-muted">{step.detail}</p> : null}
              </div>
              <StatusBadge status={step.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export const PipelineTimeline = memo(PipelineTimelineComponent);
