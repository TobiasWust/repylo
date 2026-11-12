/**
 * Everything about one muscle, for the body map's detail panel: how much it
 * gets trained compared with the goal's weekly target, whether it's
 * recovered, which exercises the user trains it with, and – when there are
 * none or it falls short – exercises to add.
 */
import { addDays, toDay, weekStart } from "./dates";
import { minorMuscles, type Muscle } from "./exercises";
import { getExercise, type Data } from "./model";
import { muscleRecovery, type MuscleRecovery } from "./recovery";
import { hasValue, setsPerMuscle, weeklySetTarget } from "./stats";

export interface MuscleExercise {
  readonly key: string;
  /** Working sets in the last eight weeks (secondary counts half). */
  readonly sets: number;
  readonly lastDate: string;
}

export interface MuscleDetail {
  readonly muscle: Muscle;
  /** Average sets per week over the last four weeks. */
  readonly weeklyAverage: number;
  /** Sets since Monday. */
  readonly thisWeek: number;
  readonly target: readonly [number, number];
  readonly recovery: MuscleRecovery;
  /** The user's exercises for this muscle, most sets first (at most four). */
  readonly exercises: readonly MuscleExercise[];
  /** Exercises to try when the muscle gets too little work (at most three). */
  readonly suggestions: readonly string[];
}

/** Weekly set target for a muscle; small muscles get plenty of indirect work, so theirs is half. */
export const muscleTarget = (data: Data, m: Muscle): readonly [number, number] => {
  const [min, max] = weeklySetTarget[data.settings.goal];
  return minorMuscles.has(m) ? [min / 2, max / 2] : [min, max];
};

export const muscleDetail = (data: Data, muscle: Muscle, now: number = Date.now()): MuscleDetail => {
  const day = toDay(new Date(now));
  const weeklyAverage = (setsPerMuscle(data, addDays(day, -27), day).get(muscle) ?? 0) / 4;
  const thisWeek = setsPerMuscle(data, weekStart(day), day).get(muscle) ?? 0;
  const target = muscleTarget(data, muscle);
  const recovery = muscleRecovery(data, now).find((r) => r.muscle === muscle)!;

  const since = addDays(day, -55);
  const byExercise = new Map<string, { sets: number; lastDate: string }>();
  for (const w of data.workouts) {
    if (w.date < since || w.date > day) continue;
    for (const e of w.exercises) {
      const ex = getExercise(data, e.exerciseKey);
      const share = ex.primary.includes(muscle) ? 1 : ex.secondary.includes(muscle) ? 0.5 : 0;
      const count = e.sets.filter(hasValue).length;
      if (share === 0 || count === 0) continue;
      const entry = byExercise.get(e.exerciseKey) ?? { sets: 0, lastDate: w.date };
      byExercise.set(e.exerciseKey, { sets: entry.sets + count * share, lastDate: w.date > entry.lastDate ? w.date : entry.lastDate });
    }
  }
  const exercises = [...byExercise]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 4);

  let suggestions: string[] = [];
  if (weeklyAverage < target[0]) {
    // Prefer equipment the user already trains with, then exercises where the muscle is the main mover.
    const used = new Set(byExercise.keys());
    const equipment = new Set(
      data.workouts.flatMap((w) => w.exercises.filter((e) => e.sets.some(hasValue)).map((e) => getExercise(data, e.exerciseKey).equipment)),
    );
    suggestions = [...data.exercises.values()]
      .filter((e) => e.primary.includes(muscle) && !used.has(e.key) && e.pattern !== "cardio")
      .map((e) => ({ key: e.key, score: (equipment.has(e.equipment) ? 2 : 0) + (e.primary.length === 1 ? 1 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.key);
  }

  return { muscle, weeklyAverage, thisWeek, target, recovery, exercises, suggestions };
};
