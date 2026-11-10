/** Helpers to build small, readable training histories for tests. */
import { addDays, today } from "../domain/dates";
import { buildData, type Data, type Rows } from "../domain/model";

export type SetSpec = [weight: number | null, reps: number];
export interface WorkoutSpec {
  daysAgo: number;
  templateId?: string;
  exercises: Record<string, SetSpec[]>;
}

export const build = (workouts: WorkoutSpec[], extra: Partial<Rows> = {}): Data => {
  const rows: Rows = {
    workouts: [],
    workoutExercises: [],
    sets: [],
    templates: [],
    customExercises: [],
    bodyWeights: [],
    settings: [
      {
        goal: "hypertrophy",
        unit: "kg",
        language: "de",
        restSeconds: 90,
        barWeight: 20,
        weeklyGoal: 1,
        standards: "male",
        prefill: "last",
        deloadWeek: null,
      },
    ],
    exerciseSettings: [],
    dismissals: [],
    ...extra,
  };
  const w = rows.workouts as unknown[],
    we = rows.workoutExercises as unknown[],
    s = rows.sets as unknown[];
  workouts.forEach((spec, wi) => {
    const workoutId = `w${wi}`;
    w.push({
      id: workoutId,
      date: addDays(today(), -spec.daysAgo),
      startedAt: wi,
      finishedAt: null,
      note: null,
      templateId: spec.templateId ?? null,
    });
    Object.entries(spec.exercises).forEach(([key, sets], ei) => {
      const exId = `${workoutId}e${ei}`;
      we.push({ id: exId, workoutId, exerciseKey: key, position: ei, note: null });
      sets.forEach(([weight, reps], si) =>
        s.push({
          id: `${exId}s${si}`,
          workoutId,
          workoutExerciseId: exId,
          exerciseKey: key,
          position: si,
          weight,
          reps,
          duration: null,
          distance: null,
          done: 1,
        }),
      );
    });
  });
  return buildData(rows);
};

export const template = (id: string, name: string, position: number, keys: string[]) => ({
  id,
  name,
  position,
  items: JSON.stringify(keys.map((exerciseKey) => ({ exerciseKey, sets: [] }))),
});
