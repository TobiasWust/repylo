/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated wss:// URLs of the sync relays; empty = Evolu's default relay. */
  readonly VITE_RELAY_URL?: string;
}

interface Window {
  /** Latest Evolu error, read by the boot watchdog in index.html. */
  __repyloEvoluError?: unknown;
  /** Error from creating the database, read by the boot watchdog. */
  __repyloBootError?: unknown;
}
