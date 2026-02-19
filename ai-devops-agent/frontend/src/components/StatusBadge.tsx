import { memo, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { StepStatus } from '@/types';

interface StatusBadgeProps {
  status: StepStatus;
}

const styles: Record<StepStatus, string> = {
  pending: 'bg-gray-700 text-gray-200 border-gray-600',
  running: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
  success: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
  failed: 'bg-red-500/20 text-red-300 border-red-400/50',
};

const labels: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
};

const iconMap: Record<StepStatus, ReactNode> = {
  pending: <Clock3 className="h-3.5 w-3.5" />,
  running: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />,
  success: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <AlertTriangle className="h-3.5 w-3.5" />,
};

function StatusBadgeComponent({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
        styles[status],
      )}
    >
      {iconMap[status]}
      {labels[status]}
    </span>
  );
}

export const StatusBadge = memo(StatusBadgeComponent);
