/**
 * The AppOwner is the user's identity: a random secret shown as a 24-word
 * phrase. Every device with the same phrase reads and syncs the same data.
 * There is no account; losing all devices AND the phrase means losing data.
 *
 * Browsers offer no better secret storage for a PWA than origin-scoped
 * storage, so the phrase lives in localStorage. Data is local to this origin
 * anyway; the phrase mainly protects what is on the relay.
 */
import {
  createAppOwner,
  Mnemonic,
  mnemonicToOwnerSecret,
  WebSocketUrl,
  type AppOwner,
  type OwnerSecret,
  type OwnerTransport,
} from "@evolu/common";

const MNEMONIC_KEY = "repylo.mnemonic";
const RELAY_KEY = "repylo.relay";
const PENDING_IMPORT_KEY = "repylo.pendingImport";

export const loadOrCreateOwner = (): AppOwner => {
  const stored = localStorage.getItem(MNEMONIC_KEY);
  const parsed = stored ? Mnemonic.fromUnknown(stored) : null;
  if (parsed?.ok) return createAppOwner(mnemonicToOwnerSecret(parsed.value));
  const secret = crypto.getRandomValues(new Uint8Array(32)) as unknown as OwnerSecret;
  const owner = createAppOwner(secret);
  localStorage.setItem(MNEMONIC_KEY, owner.mnemonic);
  return owner;
};

/** Normalizes user input (extra spaces, line breaks, capitals) into a valid phrase. */
export const parseMnemonic = (text: string): Mnemonic | null => {
  const normalized = text.trim().toLowerCase().split(/\s+/).join(" ");
  const parsed = Mnemonic.fromUnknown(normalized);
  return parsed.ok ? parsed.value : null;
};

/**
 * Joins the data of another device. `carryOver` is this device's data as a
 * backup JSON, imported into the joined database after the reload.
 */
export const switchOwner = (mnemonic: Mnemonic, carryOver: string | null): void => {
  if (carryOver) localStorage.setItem(PENDING_IMPORT_KEY, carryOver);
  localStorage.setItem(MNEMONIC_KEY, mnemonic);
  location.reload();
};

export const takePendingImport = (): string | null => {
  const value = localStorage.getItem(PENDING_IMPORT_KEY);
  localStorage.removeItem(PENDING_IMPORT_KEY);
  return value;
};

export const getRelayUrl = (): string => localStorage.getItem(RELAY_KEY) ?? "";

export const setRelayUrl = (url: string): void => {
  if (url.trim()) localStorage.setItem(RELAY_KEY, url.trim());
  else localStorage.removeItem(RELAY_KEY);
  location.reload();
};

/** Undefined means Evolu's default relay. */
export const getTransports = (): ReadonlyArray<OwnerTransport> | undefined => {
  const url = WebSocketUrl.fromUnknown(getRelayUrl());
  return url.ok ? [{ type: "WebSocket", url: url.value }] : undefined;
};
