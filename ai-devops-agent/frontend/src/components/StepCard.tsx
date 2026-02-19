'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { TerminalSquare } from 'lucide-react';

import { StatusBadge } from '@/components/StatusBadge';
import type { PipelineStep } from '@/types';

interface StepCardProps {
  step: PipelineStep;
}

function StepCardComponent({ step }: StepCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl2 border border-border bg-card p-4 shadow-soft"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-4 w-4 text-info" />
          <h4 className="font-medium text-foreground">{step.name}</h4>
        </div>
        <StatusBadge status={step.status} />
      </div>
      {step.detail ? <p className="mt-3 text-sm text-muted">{step.detail}</p> : null}
    </motion.div>
  );
}

export const StepCard = memo(StepCardComponent);
