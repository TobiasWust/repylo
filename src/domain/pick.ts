/** Choosing exercises to suggest: the user's favourites first, then the library. */
import type { Exercise, Muscle } from "./exercises";
import type { Data } from "./model";
import { hasValue } from "./stats";

/** How often each exercise was done (sessions), as a preference signal. */
const usageCounts = (data: Data): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const w of data.workouts)
    for (const e of w.exercises) if (e.sets.some(hasValue)) counts.set(e.exerciseKey, (counts.get(e.exerciseKey) ?? 0) + 1);
  return counts;
};

/** Best exercises for a predicate: the user's favourites first, then the library. */
export const pickExercises = (data: Data, matches: (e: Exercise) => boolean, recovering: ReadonlySet<Muscle>, count: number): string[] => {
  const usage = usageCounts(data);
  const candidates = [...data.exercises.values()].filter(
    (e) => matches(e) && e.metric !== "cardio" && !e.primary.some((m) => recovering.has(m)),
  );
  // Without history, prefer the general library over specialised machines.
  const libraryRank = (e: Exercise) => (e.equipment === "egym" ? 1 : 0);
  candidates.sort((a, b) => (usage.get(b.key) ?? 0) - (usage.get(a.key) ?? 0) || libraryRank(a) - libraryRank(b));
  return candidates.slice(0, count).map((e) => e.key);
};
