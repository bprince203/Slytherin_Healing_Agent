import { useEffect, useMemo, useState } from 'react';

import { mockLogs } from '@/lib/mockData';
import type { LogLine } from '@/types';

interface UseLogStreamResult {
  logs: LogLine[];
  isStreaming: boolean;
  toggleStreaming: () => void;
}

export function useLogStream(): UseLogStreamResult {
  const [logs, setLogs] = useState<LogLine[]>(mockLogs.slice(0, 4));
  const [cursor, setCursor] = useState<number>(4);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);

  useEffect(() => {
    if (!isStreaming) return;
    if (cursor >= mockLogs.length) return;

    const interval = window.setInterval(() => {
      setLogs((prev) => {
        const next = mockLogs[cursor];
        if (!next) return prev;
        return [...prev, next];
      });
      setCursor((prev) => prev + 1);
    }, 1200);

    return () => window.clearInterval(interval);
  }, [cursor, isStreaming]);

  const stableLogs = useMemo(() => logs, [logs]);

  return {
    logs: stableLogs,
    isStreaming,
    toggleStreaming: () => setIsStreaming((prev) => !prev),
  };
}
