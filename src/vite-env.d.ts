/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Comma-separated wss:// URLs of the sync relays; empty = Evolu's default relay. */
  readonly VITE_RELAY_URL?: string;
}
