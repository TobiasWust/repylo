import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createActions, type Actions } from "../db/actions";
import {
  bodyWeightsQuery,
  customExercisesQuery,
  dismissalsQuery,
  exerciseSettingsQuery,
  settingsQuery,
  setsQuery,
  templatesQuery,
  useEvolu,
  useQueries,
  workoutExercisesQuery,
  workoutsQuery,
} from "../db/schema";
import { buildData, type Data, type Language, type Rows } from "../domain/model";
import { formatWeight } from "../domain/units";
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

const AppContext = createContext<App | null>(null);

export const useApp = (): App => {
  const app = use(AppContext);
  if (!app) throw new Error("AppProvider missing");
  return app;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const evolu = useEvolu();
  const [workouts, workoutExercises, sets, templates, customExercises, bodyWeights, settings, exerciseSettings, dismissals] =
    useQueries([
      workoutsQuery,
      workoutExercisesQuery,
      setsQuery,
      templatesQuery,
      customExercisesQuery,
      bodyWeightsQuery,
      settingsQuery,
      exerciseSettingsQuery,
      dismissalsQuery,
    ]);

  const data = useMemo(
    () =>
      buildData({
        workouts,
        workoutExercises,
        sets,
        templates,
        customExercises,
        bodyWeights,
        settings,
        exerciseSettings,
        dismissals,
      } as unknown as Rows),
    [workouts, workoutExercises, sets, templates, customExercises, bodyWeights, settings, exerciseSettings, dismissals],
  );
  const actions = useMemo(() => createActions(evolu), [evolu]);

  const [tab, setTabState] = useState<Tab>("home");
  const [overlays, setOverlays] = useState<Overlay[]>([]);

  // Overlays integrate with the browser/Android back button via history state.
  const open = useCallback((overlay: Overlay) => {
    history.pushState({ repylo: true }, "");
    setOverlays((list) => [...list, overlay]);
    if (overlay.type !== "plates") window.scrollTo({ top: 0 });
  }, []);
  const back = useCallback(() => history.back(), []);
  useEffect(() => {
    const onPop = () => setOverlays((list) => list.slice(0, -1));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    window.scrollTo({ top: 0 });
  }, []);

  const lang = data.settings.language;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<App>(
    () => ({
      data,
      actions,
      lang,
      t: (de, en) => (lang === "de" ? de : en),
      exerciseName: (e) => e.name[lang],
      weight: (kg) => formatWeight(kg, data.settings.unit, lang),
      tab,
      setTab,
      overlays,
      open,
      back,
    }),
    [data, actions, lang, tab, setTab, overlays, open, back],
  );

  return <AppContext value={value}>{children}</AppContext>;
};
