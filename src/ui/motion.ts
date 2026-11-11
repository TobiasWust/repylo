/**
 * Helpers for small animations. CSS does the moving; these only decide when
 * something is new enough to deserve it.
 */
import { useEffect, useState } from "react";

export const reducedMotion = (): boolean => {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

// Lives for the whole visit, across screen changes (screens remount on every visit).
const seen = new Map<string, unknown>();

/**
 * What `key` showed the last time a screen displayed it (undefined the first
 * time), fixed for this mount, while `value` is remembered for the next one.
 * Lets a screen animate what changed since you last looked, e.g. a day that
 * got ticked off while you were in the workout.
 */
export const useLastSeen = <T>(key: string, value: T): T | undefined => {
  const [previous] = useState(() => seen.get(key) as T | undefined);
  useEffect(() => {
    seen.set(key, value);
  }, [key, value]);
  return previous;
};

/** Ids present when the component mounted: anything not in it was added since. */
export const useInitialIds = (ids: readonly string[]): ReadonlySet<string> => {
  const [initial] = useState(() => new Set(ids));
  return initial;
};
