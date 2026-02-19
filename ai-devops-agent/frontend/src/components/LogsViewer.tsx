'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { Download, Copy, PauseCircle, PlayCircle } from 'lucide-react';
import { FixedSizeList as List, type ListChildComponentProps } from 'react-window';
import { toast } from 'sonner';

import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useLogStream } from '@/hooks/useLogStream';
import { cn } from '@/lib/utils';

const levelClass = {
  info: 'text-slate-300',
  warn: 'text-amber-300',
  error: 'text-red-300',
  success: 'text-emerald-300',
} as const;

const ROW_HEIGHT = 28;

function LogsViewerComponent() {
  const { logs, isStreaming, toggleStreaming } = useLogStream();
  const { autoScroll, toggleAutoScroll } = useAutoScroll<HTMLDivElement>(logs.length);
  const listRef = useRef<List>(null);

  const lines = useMemo(() => logs, [logs]);

  useEffect(() => {
    // Scroll to latest virtualized row only when auto-scroll is enabled.
    if (!autoScroll || lines.length === 0) return;
    listRef.current?.scrollToItem(lines.length - 1, 'end');
  }, [autoScroll, lines.length]);

  const copyLogs = async () => {
    const payload = lines.map((line) => `[${line.ts}] ${line.text}`).join('\n');
    await navigator.clipboard.writeText(payload);
    toast.success('Logs copied');
  };

  const downloadLogs = () => {
    const payload = lines.map((line) => `[${line.ts}] ${line.text}`).join('\n');
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
    const line = lines[index];
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
          <button
            onClick={toggleStreaming}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground"
          >
            {isStreaming ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {isStreaming ? 'Pause stream' : 'Resume stream'}
          </button>
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
        <List ref={listRef} height={320} itemCount={lines.length} itemSize={ROW_HEIGHT} width="100%">
          {Row}
        </List>
      </div>
    </section>
  );
}

export const LogsViewer = memo(LogsViewerComponent);
