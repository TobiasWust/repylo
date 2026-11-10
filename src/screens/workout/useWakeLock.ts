import { useEffect } from "react";

/**
 * Keeps the screen on while a live workout is open. Browsers drop the lock
 * when the tab is hidden, so it is re-requested on return.
 */
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {
          // Denied (e.g. battery saver): the app works fine without it.
        });
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, [active]);
};
