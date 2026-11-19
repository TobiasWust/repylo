/**
 * Readiness ("Tagesform"): a two-question check before a workout. It adjusts
 * today's suggestions and, over time, shows how sleep and energy relate to
 * performance.
 */
import type { Data, Workout } from "./model";
import { e1rm, exerciseSessions, hasValue } from "./stats";

export type Readiness = "low" | "mid" | "high";

/** Both answers 1–3; skipped (0) or unanswered gives null. */
export const readinessOf = (w: Pick<Workout, "sleep" | "energy">): Readiness | null => {
  if (!w.sleep || !w.energy) return null;
  const score = w.sleep + w.energy;
  return score <= 3 ? "low" : score >= 6 ? "high" : "mid";
};

export interface ReadinessLevelEffect {
  readonly level: Readiness;
  readonly workouts: number;
  /** Performance vs. your own average across rated workouts, in percentage points. */
  readonly diff: number;
}

export interface ReadinessEffect {
  readonly levels: readonly ReadinessLevelEffect[];
  /** Largest gap between two levels, in percentage points. */
  readonly spread: number;
  /** Does readiness make a real difference for this user? */
  readonly matters: boolean;
}

/** Workouts per level before a level is compared at all. */
export const minWorkoutsPerLevel = 3;
/** A gap below this between levels is noise, not a pattern. */
const meaningfulSpread = 3;

/**
 * How readiness relates to performance for this user. Each exercise is
 * compared with its previous session (est. 1RM), so different workouts stay
 * comparable; each level is then measured against the user's own average
 * change, which takes normal progress out of the picture.
 * Null until at least two levels have enough workouts to compare.
 */
export const readinessEffect = (data: Data): ReadinessEffect | null => {
  const changes = new Map<Readiness, number[]>();
  const counts = new Map<Readiness, number>();
  for (const w of data.workouts) {
    const level = readinessOf(w);
    if (!level) continue;
    let counted = false;
    for (const e of w.exercises) {
      const current = Math.max(0, ...e.sets.filter(hasValue).map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)));
      const previous = exerciseSessions(data, e.exerciseKey, w.id).at(-1)?.bestE1rm ?? 0;
      if (current <= 0 || previous <= 0) continue;
      changes.set(level, [...(changes.get(level) ?? []), ((current - previous) / previous) * 100]);
      counted = true;
    }
    if (counted) counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  const all = [...changes.values()].flat();
  const average = all.reduce((a, b) => a + b, 0) / (all.length || 1);
  const levels = (["low", "mid", "high"] as const)
    .filter((level) => (counts.get(level) ?? 0) >= minWorkoutsPerLevel)
    .map((level) => {
      const values = changes.get(level)!;
      return { level, workouts: counts.get(level)!, diff: values.reduce((a, b) => a + b, 0) / values.length - average };
    });
  if (levels.length < 2) return null;
  const spread = Math.max(...levels.map((l) => l.diff)) - Math.min(...levels.map((l) => l.diff));
  return { levels, spread, matters: spread >= meaningfulSpread };
};
