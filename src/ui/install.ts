/**
 * "Install repylo" support.
 *
 * Chromium browsers (Chrome, Edge, Samsung Internet) fire `beforeinstallprompt`
 * when the PWA is installable; we keep that event so a button can open the
 * native install dialog later. Safari and Firefox have no such event, so the
 * UI shows short manual instructions there instead.
 *
 * The event can fire before React renders, so this module is imported early
 * in main.tsx and starts listening right away.
 */
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type InstallMode = "installed" | "prompt" | "ios" | "firefox" | "unsupported";

const DISMISS_KEY = "repylo.installDismissedUntil";

let deferred: BeforeInstallPromptEvent | null = null;
let installed =
  matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
});
addEventListener("appinstalled", () => {
  installed = true;
  deferred = null;
  notify();
});

const ua = navigator.userAgent;
const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isFirefoxAndroid = /Android/.test(ua) && /Firefox\//.test(ua);

const currentMode = (): InstallMode => {
  if (installed) return "installed";
  if (deferred) return "prompt";
  if (isIos) return "ios";
  if (isFirefoxAndroid) return "firefox";
  return "unsupported";
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useInstallMode = (): InstallMode => useSyncExternalStore(subscribe, currentMode);

/** Opens the browser's install dialog; resolves true if the user accepted. */
export const promptInstall = async (): Promise<boolean> => {
  const event = deferred;
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can only be used once.
  deferred = null;
  notify();
  return outcome === "accepted";
};

/** Installing is per device, so the "not now" choice is stored locally, not synced. */
export const isInstallDismissed = (): boolean => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
};

export const dismissInstall = (days: number): void => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86_400_000));
  } catch {
    // Storage unavailable (private mode): the card simply shows again next time.
  }
};
