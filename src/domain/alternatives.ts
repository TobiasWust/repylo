/**
 * Replacements for an exercise: other exercises for the same muscles, for
 * when a machine is taken or missing, or just for variety.
 *
 * An alternative must share at least one main muscle (cardio: any cardio).
 * Ranking: listed variants first, then how closely the main muscles match,
 * then the same movement pattern, then exercises the user already knows.
 */
import type { Exercise } from "./exercises";
import { getExercise, type Data } from "./model";
import { hasValue } from "./stats";

const overlap = (a: readonly string[], b: readonly string[]): number => {
  if (a.length === 0 || b.length === 0) return 0;
  const shared = a.filter((m) => b.includes(m)).length;
  return shared / new Set([...a, ...b]).size;
};

export const alternatives = (data: Data, exerciseKey: string, exclude: ReadonlySet<string> = new Set()): Exercise[] => {
  const target = getExercise(data, exerciseKey);
  const known = new Set(data.workouts.flatMap((w) => w.exercises.filter((e) => e.sets.some(hasValue)).map((e) => e.exerciseKey)));
  const isCardio = target.pattern === "cardio";

  const scored: { exercise: Exercise; score: number }[] = [];
  for (const e of data.exercises.values()) {
    if (e.key === exerciseKey || exclude.has(e.key)) continue;
    if ((e.pattern === "cardio") !== isCardio) continue;
    const muscles = overlap(target.primary, e.primary);
    if (!isCardio && muscles === 0) continue;
    const variant = target.variants.includes(e.key) || e.variants.includes(exerciseKey);
    const score =
      (variant ? 5 : 0) +
      muscles * 4 +
      overlap(target.secondary, e.secondary) +
      (e.pattern === target.pattern ? 1 : 0) +
      (known.has(e.key) ? 0.5 : 0);
    scored.push({ exercise: e, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.exercise);
};
