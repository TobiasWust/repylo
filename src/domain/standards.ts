/**
 * Strength standards: estimated 1RM relative to body weight, for the classic
 * barbell lifts. The thresholds are rough, commonly cited guide values for
 * adult lifters — good for orientation, not a precise ranking. Machines
 * (incl. EGYM) aren't comparable across brands, so they're not rated.
 */
import type { Data, Standards } from "./model";
import { bodyWeightAt, exerciseSessions } from "./stats";
import { addDays, today } from "./dates";

export const levels = ["beginner", "novice", "intermediate", "advanced", "elite"] as const;
export type Level = (typeof levels)[number];

/** Thresholds (× body weight) at which each level starts. */
const table: Record<string, Record<Standards, readonly [number, number, number, number, number]>> = {
  bench_press: { male: [0.5, 0.75, 1.0, 1.5, 2.0], female: [0.25, 0.5, 0.75, 1.0, 1.5] },
  squat: { male: [0.75, 1.25, 1.5, 2.25, 2.75], female: [0.5, 0.75, 1.25, 1.5, 2.0] },
  deadlift: { male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 1.0, 1.25, 1.75, 2.5] },
  overhead_press: { male: [0.35, 0.55, 0.75, 1.0, 1.4], female: [0.2, 0.35, 0.5, 0.75, 1.0] },
  barbell_row: { male: [0.5, 0.75, 1.0, 1.5, 1.75], female: [0.25, 0.4, 0.65, 0.9, 1.2] },
};

export const ratedExercises = Object.keys(table);

export interface Rating {
  readonly exerciseKey: string;
  /** Best estimated 1RM ÷ body weight. */
  readonly ratio: number;
  readonly level: Level;
  /** 0–1 progress from this level's threshold towards the next one. */
  readonly progress: number;
  /** Ratio needed for the next level, or null at elite. */
  readonly nextRatio: number | null;
  readonly thresholds: readonly number[];
}

export const rate = (exerciseKey: string, ratio: number, standards: Standards): Rating | null => {
  const thresholds = table[exerciseKey]?.[standards];
  if (!thresholds) return null;
  let index = 0;
  for (let i = 0; i < thresholds.length; i++) if (ratio >= thresholds[i]!) index = i;
  const current = thresholds[index]!;
  const next = thresholds[index + 1] ?? null;
  const progress = next === null ? 1 : Math.max(0, Math.min(1, (ratio - current) / (next - current)));
  return { exerciseKey, ratio, level: levels[index]!, progress, nextRatio: next, thresholds };
};

/** Rating for an exercise using its best e1RM of the last 90 days and the current body weight. */
export const rateExercise = (data: Data, exerciseKey: string): Rating | null => {
  const standards = data.settings.standards;
  const bodyWeight = bodyWeightAt(data, today());
  if (!standards || !bodyWeight || !table[exerciseKey]) return null;
  const since = addDays(today(), -90);
  const recent = exerciseSessions(data, exerciseKey).filter((s) => s.date >= since);
  const best = Math.max(0, ...recent.map((s) => s.bestE1rm));
  return best > 0 ? rate(exerciseKey, best / bodyWeight, standards) : null;
};
