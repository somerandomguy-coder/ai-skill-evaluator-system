"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Creates a debounced callback that executes immediately on the first call (leading edge),
 * and ignores/drops all subsequent calls for `delayMs`.
 * Perfect for button clicks and form submissions to prevent double-clicks.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number = 600
): T {
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>): ReturnType<T> | undefined => {
      const now = Date.now();
      if (now - lastCallRef.current < delayMs) {
        // Drop subsequent rapid clicks
        return undefined;
      }
      lastCallRef.current = now;
      return callbackRef.current(...args);
    },
    [delayMs]
  ) as T;
}

/**
 * Wraps an async function with an in-flight guard and cooldown period.
 * Guarantees that only one promise can run at a time, completely ignoring
 * any rapid multi-clicks until the promise settles.
 */
export function useAsyncLock<T extends (...args: any[]) => Promise<any>>(
  asyncFn: T,
  minCooldownMs: number = 500
): [(...args: Parameters<T>) => Promise<any>, boolean] {
  const [isPending, setIsPending] = useState(false);
  const inFlightRef = useRef(false);
  const asyncFnRef = useRef<T>(asyncFn);

  useEffect(() => {
    asyncFnRef.current = asyncFn;
  }, [asyncFn]);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<any> => {
      if (inFlightRef.current) {
        return undefined;
      }
      inFlightRef.current = true;
      setIsPending(true);

      try {
        const result = await asyncFnRef.current(...args);
        return result;
      } finally {
        setTimeout(() => {
          inFlightRef.current = false;
          setIsPending(false);
        }, minCooldownMs);
      }
    },
    [minCooldownMs]
  );

  return [execute, isPending];
}
