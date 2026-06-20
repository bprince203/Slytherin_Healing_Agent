'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Copy, PauseCircle, PlayCircle } from 'lucide-react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { toast } from 'sonner';

import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useLogStream } from '@/hooks/useLogStream';
import { cn } from '@/lib/utils';
import type { LogLine } from '@/types';

interface LogsViewerProps {
  runId?: string;
  externalLogs?: LogLine[];
}

const levelClass = {
  info: 'text-slate-300',
  warn: 'text-amber-300',
  error: 'text-red-300',
  success: 'text-emerald-300',
} as const;

const ROW_HEIGHT = 28;
type LogFilter = 'all' | LogLine['level'];

function LogsViewerComponent({ runId, externalLogs }: LogsViewerProps) {
  const { logs, isStreaming, toggleStreaming } = useLogStream(runId);
  const lines = useMemo(() => externalLogs ?? logs, [externalLogs, logs]);
  const [levelFilter, setLevelFilter] = useState<LogFilter>('all');
  const filteredLines = useMemo(
    () => (levelFilter === 'all' ? lines : lines.filter((line) => line.level === levelFilter)),
    [lines, levelFilter],
  );
  const hasExternalLogs = Boolean(externalLogs);
  const { autoScroll, toggleAutoScroll } = useAutoScroll<HTMLDivElement>(filteredLines.length);
  const listRef = useRef<List>(null);

  useEffect(() => {
    // Scroll to latest virtualized row only when auto-scroll is enabled.
    if (!autoScroll || filteredLines.length === 0) return;
    listRef.current?.scrollToItem(filteredLines.length - 1, 'end');
  }, [autoScroll, filteredLines.length]);

  const copyLogs = async () => {
    const payload = filteredLines.map((line) => `[${line.ts}] ${line.text}`).join('\n');
    await navigator.clipboard.writeText(payload);
    toast.success('Logs copied');
  };

  const downloadLogs = () => {
    const payload = filteredLines.map((line) => `[${line.ts}] ${line.text}`).join('\n');
    const blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pipeline-logs.txt';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Logs downloaded');
  };

  const Row = ({ index, style }: ListChildComponentProps) => {
    const line = filteredLines[index];
    return (
      <div style={style} className="px-3">
        <p className={cn('font-mono text-xs', levelClass[line.level])}>
          <span className="mr-2 text-gray-500">[{line.ts}]</span>
          {line.text}
        </p>
      </div>
    );
  };

  return (
    <section className="rounded-xl2 border border-border bg-[#0A0F1D] p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Live Logs</h3>
        <div className="flex flex-wrap gap-2">
          {(['all', 'info', 'warn', 'error', 'success'] as LogFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setLevelFilter(filter)}
              className={cn(
                'rounded-lg border px-2 py-1 text-xs',
                levelFilter === filter
                  ? 'border-info bg-info/10 text-info'
                  : 'border-border text-foreground hover:bg-white/5',
              )}
            >
              {filter.toUpperCase()}
            </button>
          ))}
          {!hasExternalLogs ? (
            <button
              onClick={toggleStreaming}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground"
            >
              {isStreaming ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
              {isStreaming ? 'Pause stream' : 'Resume stream'}
            </button>
          ) : null}
          <button
            onClick={toggleAutoScroll}
            className="rounded-lg border border-border px-2 py-1 text-xs text-foreground"
          >
            Auto-scroll: {autoScroll ? 'On' : 'Off'}
          </button>
          <button onClick={copyLogs} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </button>
          <button
            onClick={downloadLogs}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-border/70 bg-black/40 py-2">
        <List ref={listRef} height={320} itemCount={filteredLines.length} itemSize={ROW_HEIGHT} width="100%">
          {Row}
        </List>
      </div>
    </section>
  );
}

export const LogsViewer = memo(LogsViewerComponent);
