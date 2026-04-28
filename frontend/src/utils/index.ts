import { useCallback, useEffect, useRef } from 'react';

export const GLOBAL_PICKS_DEADLINE = new Date('2026-06-11T16:00:00Z');

export function isPastGlobalDeadline(): boolean {
  return Date.now() > GLOBAL_PICKS_DEADLINE.getTime();
}

export function isMatchLocked(scheduledAt: string, lockedAt?: string | null): boolean {
  if (lockedAt && new Date(lockedAt).getTime() <= Date.now()) return true;
  return new Date(scheduledAt).getTime() <= Date.now();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useDebouncedCallback<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): (...args: TArgs) => void {
  const timer = useRef<number | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (...args: TArgs) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay],
  );
}
