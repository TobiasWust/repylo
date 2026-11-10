import { createContext, use } from "react";
import type { Actions } from "../db/actions";
import type { Data, Language } from "../domain/model";
import type { Exercise } from "../domain/exercises";

export type Tab = "home" | "history" | "stats" | "body" | "settings";

/** Screens stacked on top of the tabs (full-screen views). */
export type Overlay =
  | { readonly type: "workout"; readonly id: string }
  | { readonly type: "exercise"; readonly key: string }
  | { readonly type: "plates"; readonly weight?: number }
  | { readonly type: "review"; readonly month: string };

export interface App {
  readonly data: Data;
  readonly actions: Actions;
  readonly lang: Language;
  /** Inline translation: t("Hallo", "Hello"). Keeps strings next to their use. */
  readonly t: (de: string, en: string) => string;
  readonly exerciseName: (e: Exercise) => string;
  readonly weight: (kg: number) => string;
  readonly tab: Tab;
  readonly setTab: (tab: Tab) => void;
  readonly overlays: readonly Overlay[];
  readonly open: (overlay: Overlay) => void;
  readonly back: () => void;
}

export const AppContext = createContext<App | null>(null);

export const useApp = (): App => {
  const app = use(AppContext);
  if (!app) throw new Error("AppProvider missing");
  return app;
};
