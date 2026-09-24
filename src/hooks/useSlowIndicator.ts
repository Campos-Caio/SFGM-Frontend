import { useEffect, useState } from 'react';

/** Após quanto tempo uma operação em curso é considerada "lenta". */
export const SLOW_THRESHOLD_MS = 4_000;

/**
 * `true` quando `pending` permanece verdadeiro por mais de `ms`; volta a
 * `false` assim que `pending` termina.
 */
export function useSlowIndicator(pending: boolean, ms: number = SLOW_THRESHOLD_MS): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [pending, ms]);

  return slow;
}
