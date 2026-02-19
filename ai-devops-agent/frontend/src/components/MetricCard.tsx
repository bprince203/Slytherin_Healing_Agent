'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

import type { MetricItem } from '@/types';

interface MetricCardProps {
  item: MetricItem;
}

function MetricCardComponent({ item }: MetricCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl2 border border-border bg-card p-4 shadow-soft"
    >
      <p className="text-sm text-muted">{item.label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
      {item.hint ? <p className="mt-2 text-xs text-muted">{item.hint}</p> : null}
    </motion.article>
  );
}

export const MetricCard = memo(MetricCardComponent);
