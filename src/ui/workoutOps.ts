import type { Actions } from "../db/actions";
import { today } from "../domain/dates";
import type { Data, Template, TemplateItem, TemplateSet, Workout } from "../domain/model";
import { exerciseSessions } from "../domain/stats";

/**
 * Today's workout, or a freshly created one. A new workout isn't in `data`
 * until Evolu's query refreshes, so we return a placeholder object with the
 * new id that callers can add exercises to immediately.
 */
export const ensureTodayWorkout = (data: Data, actions: Actions, templateId: string | null = null): Workout => {
  const existing = data.workouts.find((w) => w.date === today());
  if (existing) {
    if (templateId && !existing.templateId) actions.updateWorkout(existing.id, { templateId });
    return existing;
  }
  const id = actions.startWorkout(today(), templateId);
  return { id, date: today(), startedAt: Date.now(), finishedAt: null, note: null, templateId, exercises: [] };
};

const emptySet: TemplateSet = { weight: null, reps: null, duration: null, distance: null };

/**
 * Sets for a newly added exercise: exactly what was done last time. The
 * progression chip in the workout screen then offers the next step, so the
 * user decides whether to go up today.
 */
export const initialSets = (data: Data, exerciseKey: string, workoutId?: string): TemplateSet[] => {
  const last = exerciseSessions(data, exerciseKey, workoutId).at(-1);
  return last
    ? last.sets.map((s) => ({ weight: s.weight, reps: s.reps, duration: s.duration, distance: s.distance }))
    : [emptySet, emptySet, emptySet];
};

/** Template exercises, pre-filled with the latest values where there is history. */
export const templateItems = (data: Data, template: Template, workoutId?: string): TemplateItem[] =>
  template.items.map((item) => ({
    exerciseKey: item.exerciseKey,
    sets: exerciseSessions(data, item.exerciseKey, workoutId).length > 0 ? initialSets(data, item.exerciseKey, workoutId) : item.sets,
  }));

export const workoutToItems = (workout: Workout): TemplateItem[] =>
  workout.exercises.map((e) => ({
    exerciseKey: e.exerciseKey,
    sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps, duration: s.duration, distance: s.distance })),
  }));
