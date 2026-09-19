"use client";

import { useSyncExternalStore } from "react";

const subscribe = (notify: () => void) => {
  const id = setInterval(notify, 1000);
  return () => clearInterval(id);
};
const snapshot = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => 0;

/**
 * Whole seconds since the epoch, ticking once a second. Built on
 * useSyncExternalStore so reading the clock is not an impure render or a
 * setState-in-effect, and hydration sees a stable server value.
 */
export function useNowSeconds(): number {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
