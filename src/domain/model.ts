import {
  builtinExercises,
  muscles,
  unknownExercise,
  type Equipment,
  type Exercise,
  type Metric,
  type Muscle,
  type Pattern,
} from "./exercises";

export type Goal = "strength" | "hypertrophy" | "endurance";
export type Unit = "kg" | "lb";
export type Language = "de" | "en";

export interface SetEntry {
  readonly id: string;
  readonly workoutId: string;
  readonly workoutExerciseId: string;
  readonly exerciseKey: string;
  readonly position: number;
  /** kg */
  readonly weight: number | null;
  readonly reps: number | null;
  /** seconds */
  readonly duration: number | null;
  /** meters */
  readonly distance: number | null;
  readonly done: boolean;
}

export interface WorkoutExercise {
  readonly id: string;
  readonly workoutId: string;
  readonly exerciseKey: string;
  readonly position: number;
  readonly note: string | null;
  readonly sets: readonly SetEntry[];
}

export interface Workout {
  readonly id: string;
  readonly date: string;
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly note: string | null;
  readonly templateId: string | null;
  /** Readiness check: 1 poor, 2 okay, 3 good, 0 skipped, null not asked. */
  readonly sleep: number | null;
  readonly energy: number | null;
  readonly exercises: readonly WorkoutExercise[];
}

export interface TemplateSet {
  readonly weight: number | null;
  readonly reps: number | null;
  readonly duration: number | null;
  readonly distance: number | null;
}
export interface TemplateItem {
  readonly exerciseKey: string;
  readonly sets: readonly TemplateSet[];
}
export interface Template {
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly items: readonly TemplateItem[];
}

export interface BodyWeight {
  readonly id: string;
  readonly date: string;
  readonly weight: number;
}

export interface Settings {
  readonly goal: Goal;
  readonly unit: Unit;
  readonly language: Language;
  readonly restSeconds: number;
  /** kg */
  readonly barWeight: number;
  /** Training days per week. */
  readonly weeklyGoal: number;
  /** Strength standards to compare against; null until the user picks. */
  readonly standards: Standards | null;
  /** Pre-fill new sets with last time's values or with the progression target. */
  readonly prefill: Prefill;
  /** Monday of the last planned deload week, if any. */
  readonly deloadWeek: string | null;
}

export type Prefill = "last" | "target";

export type Standards = "male" | "female";

export interface Data {
  /** Newest first. */
  readonly workouts: readonly Workout[];
  readonly templates: readonly Template[];
  /** Oldest first. */
  readonly bodyWeights: readonly BodyWeight[];
  readonly settings: Settings;
  readonly exerciseGoals: ReadonlyMap<string, Goal>;
  readonly exercises: ReadonlyMap<string, Exercise>;
  readonly dismissedUntil: ReadonlyMap<string, number>;
}

export const getExercise = (data: Pick<Data, "exercises">, key: string): Exercise =>
  data.exercises.get(key) ?? unknownExercise(key);

export const goalFor = (data: Pick<Data, "settings" | "exerciseGoals">, key: string): Goal =>
  data.exerciseGoals.get(key) ?? data.settings.goal;

export const defaultRest: Record<Goal, number> = { strength: 180, hypertrophy: 90, endurance: 60 };

export const detectLanguage = (): Language =>
  navigator.language.toLowerCase().startsWith("de") ? "de" : "en";

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Rows straight from Evolu: every selected column may be null. */
type Nullable<T> = { readonly [K in keyof T]: T[K] | null };

export interface Rows {
  readonly workouts: readonly Nullable<Omit<Workout, "exercises">>[];
  readonly workoutExercises: readonly Nullable<Omit<WorkoutExercise, "sets">>[];
  readonly sets: readonly (Nullable<Omit<SetEntry, "done">> & { readonly done: 0 | 1 | null })[];
  readonly templates: readonly Nullable<Omit<Template, "items"> & { items: string }>[];
  readonly customExercises: readonly Nullable<{
    id: string;
    name: string;
    equipment: string;
    metric: string;
    pattern: string;
    primary: string;
    secondary: string;
  }>[];
  readonly bodyWeights: readonly Nullable<BodyWeight>[];
  readonly settings: readonly Nullable<{
    goal: string;
    unit: string;
    language: string;
    restSeconds: number;
    barWeight: number;
    weeklyGoal: number;
    standards: string;
    prefill: string;
    deloadWeek: string;
  }>[];
  readonly exerciseSettings: readonly Nullable<{ exerciseKey: string; goal: string }>[];
  readonly dismissals: readonly Nullable<{ key: string; until: number }>[];
}

const parseMuscles = (value: string | null): Muscle[] =>
  (value ?? "").split(",").filter((m): m is Muscle => (muscles as readonly string[]).includes(m));

const parseTemplateItems = (json: string | null): TemplateItem[] => {
  try {
    const parsed: unknown = JSON.parse(json ?? "[]");
    return Array.isArray(parsed) ? (parsed as TemplateItem[]) : [];
  } catch {
    return [];
  }
};

const groupBy = <T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> => {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/**
 * Turns flat, nullable database rows into a typed, nested model.
 * Rows with missing required fields (e.g. partially synced) are skipped.
 */
export const buildData = (rows: Rows): Data => {
  const sets: SetEntry[] = [];
  for (const r of rows.sets) {
    if (!r.id || !r.workoutId || !r.workoutExerciseId || !r.exerciseKey) continue;
    sets.push({
      id: r.id,
      workoutId: r.workoutId,
      workoutExerciseId: r.workoutExerciseId,
      exerciseKey: r.exerciseKey,
      position: r.position ?? 0,
      weight: r.weight,
      reps: r.reps,
      duration: r.duration,
      distance: r.distance,
      done: r.done === 1,
    });
  }
  const setsByExercise = groupBy(sets, (s) => s.workoutExerciseId);

  const workoutExercises: WorkoutExercise[] = [];
  for (const r of rows.workoutExercises) {
    if (!r.id || !r.workoutId || !r.exerciseKey) continue;
    workoutExercises.push({
      id: r.id,
      workoutId: r.workoutId,
      exerciseKey: r.exerciseKey,
      position: r.position ?? 0,
      note: r.note,
      sets: (setsByExercise.get(r.id) ?? []).sort(byPosition),
    });
  }
  const exercisesByWorkout = groupBy(workoutExercises, (e) => e.workoutId);

  const workouts: Workout[] = [];
  for (const r of rows.workouts) {
    if (!r.id || !r.date) continue;
    workouts.push({
      id: r.id,
      date: r.date,
      startedAt: r.startedAt ?? 0,
      finishedAt: r.finishedAt,
      note: r.note,
      templateId: r.templateId,
      sleep: r.sleep,
      energy: r.energy,
      exercises: (exercisesByWorkout.get(r.id) ?? []).sort(byPosition),
    });
  }
  workouts.sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt);

  const exercises = new Map<string, Exercise>(builtinExercises.map((e) => [e.key, e]));
  for (const r of rows.customExercises) {
    if (!r.id || !r.name) continue;
    exercises.set(r.id, {
      key: r.id,
      name: { de: r.name, en: r.name },
      equipment: oneOf<Equipment>(r.equipment, ["barbell", "dumbbell", "kettlebell", "machine", "egym", "cable", "bodyweight", "cardio", "other"], "other"),
      metric: oneOf<Metric>(r.metric, ["weight", "bodyweight", "time", "cardio"], "weight"),
      pattern: oneOf<Pattern>(r.pattern, ["push", "pull", "legs", "core", "cardio"], "core"),
      primary: parseMuscles(r.primary),
      secondary: parseMuscles(r.secondary),
      variants: [],
      custom: true,
    });
  }

  const s = rows.settings[0];
  const goal = oneOf<Goal>(s?.goal ?? null, ["strength", "hypertrophy", "endurance"], "hypertrophy");
  const settings: Settings = {
    goal,
    unit: oneOf<Unit>(s?.unit ?? null, ["kg", "lb"], "kg"),
    language: oneOf<Language>(s?.language ?? null, ["de", "en"], detectLanguage()),
    restSeconds: s?.restSeconds ?? defaultRest[goal],
    barWeight: s?.barWeight ?? 20,
    weeklyGoal: Math.min(7, Math.max(1, s?.weeklyGoal ?? 3)),
    standards: s?.standards === "male" || s?.standards === "female" ? s.standards : null,
    prefill: s?.prefill === "target" ? "target" : "last",
    deloadWeek: s?.deloadWeek ?? null,
  };

  const exerciseGoals = new Map<string, Goal>();
  for (const r of rows.exerciseSettings) {
    if (r.exerciseKey && r.goal) exerciseGoals.set(r.exerciseKey, oneOf<Goal>(r.goal, ["strength", "hypertrophy", "endurance"], goal));
  }

  const dismissedUntil = new Map<string, number>();
  for (const r of rows.dismissals) if (r.key && r.until) dismissedUntil.set(r.key, r.until);

  return {
    workouts,
    templates: rows.templates
      .filter((t) => t.id && t.name)
      .map((t) => ({ id: t.id!, name: t.name!, position: t.position ?? 0, items: parseTemplateItems(t.items) }))
      .sort(byPosition),
    bodyWeights: rows.bodyWeights
      .filter((b): b is BodyWeight => !!b.id && !!b.date && b.weight != null)
      .sort((a, b) => a.date.localeCompare(b.date)),
    settings,
    exerciseGoals,
    exercises,
    dismissedUntil,
  };
};
