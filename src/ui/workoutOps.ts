import type { Actions } from "../db/actions";
import { today } from "../domain/dates";
import type { Data, Template, TemplateItem, TemplateSet, Workout } from "../domain/model";
import { exerciseSessions } from "../domain/stats";
import { suggestProgression } from "../domain/progression";
import { estimateStart } from "../domain/estimate";

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
  return { id, date: today(), startedAt: Date.now(), finishedAt: null, note: null, templateId, sleep: null, energy: null, exercises: [] };
};

const emptySet: TemplateSet = { weight: null, reps: null, duration: null, distance: null };

/**
 * Sets for a newly added exercise. By default exactly what was done last
 * time, and the progression chip offers the next step. With the "target"
 * setting the progression suggestion is filled in directly, so the user only
 * has to tick sets off.
 */
export const initialSets = (data: Data, exerciseKey: string, workoutId?: string): TemplateSet[] => {
  if (data.settings.prefill === "target") {
    const target = suggestProgression(data, exerciseKey, workoutId);
    if (target) return [...target.sets];
  }
  const last = exerciseSessions(data, exerciseKey, workoutId).at(-1);
  if (last) return last.sets.map((s) => ({ weight: s.weight, reps: s.reps, duration: s.duration, distance: s.distance }));
  // Never done before: an estimated starting point instead of empty sets.
  return [...(estimateStart(data, exerciseKey)?.sets ?? [emptySet, emptySet, emptySet])];
};

/** Template exercises, pre-filled with the latest values where there is history. */
export const templateItems = (data: Data, template: Template, workoutId?: string): TemplateItem[] =>
  template.items.map((item) => ({
    exerciseKey: item.exerciseKey,
    sets:
      exerciseSessions(data, item.exerciseKey, workoutId).length > 0
        ? initialSets(data, item.exerciseKey, workoutId)
        : withEstimate(data, item),
  }));

/** Keeps a template's sets and reps but fills in an estimated weight where none is set. */
const withEstimate = (data: Data, item: TemplateItem): readonly TemplateSet[] => {
  const estimate = estimateStart(data, item.exerciseKey)?.sets[0];
  return item.sets.map((s) => (s.weight == null && estimate?.weight != null ? { ...s, weight: estimate.weight } : s));
};

export const workoutToItems = (workout: Workout): TemplateItem[] =>
  workout.exercises.map((e) => ({
    exerciseKey: e.exerciseKey,
    sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps, duration: s.duration, distance: s.distance })),
  }));
