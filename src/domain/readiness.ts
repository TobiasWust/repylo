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

export interface ReadinessInsight {
  readonly level: Readiness;
  readonly workouts: number;
  /** Average change of best est. 1RM vs. each exercise's previous session, in %. */
  readonly change: number;
}

/**
 * Average performance per readiness level, compared exercise by exercise
 * with the previous session, so different workouts stay comparable.
 */
export const readinessInsights = (data: Data): ReadinessInsight[] => {
  const groups = new Map<Readiness, number[]>();
  const counts = new Map<Readiness, number>();
  for (const w of data.workouts) {
    const level = readinessOf(w);
    if (!level) continue;
    counts.set(level, (counts.get(level) ?? 0) + 1);
    for (const e of w.exercises) {
      const current = Math.max(0, ...e.sets.filter(hasValue).map((s) => e1rm(s.weight ?? 0, s.reps ?? 0)));
      const previous = exerciseSessions(data, e.exerciseKey, w.id).at(-1)?.bestE1rm ?? 0;
      if (current > 0 && previous > 0) groups.set(level, [...(groups.get(level) ?? []), ((current - previous) / previous) * 100]);
    }
  }
  return (["low", "mid", "high"] as const)
    .filter((level) => (groups.get(level)?.length ?? 0) > 0)
    .map((level) => {
      const values = groups.get(level)!;
      return { level, workouts: counts.get(level) ?? 0, change: values.reduce((a, b) => a + b, 0) / values.length };
    });
};
