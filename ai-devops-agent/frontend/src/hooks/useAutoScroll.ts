import { useEffect, useRef, useState } from 'react';

export function useAutoScroll<T extends HTMLElement>(trigger?: unknown) {
  const ref = useRef<T | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  useEffect(() => {
    // Keep the viewer pinned to latest logs while auto-scroll is enabled.
    if (!autoScroll || !ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [autoScroll, trigger]);

  return {
    ref,
    autoScroll,
    toggleAutoScroll: () => setAutoScroll((prev) => !prev),
  };
}
