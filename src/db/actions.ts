/**
 * All writes go through here. Evolu requires validated (branded) values, so
 * each helper converts plain app values with the schema's Types.
 */
import {
  createIdFromString,
  NonEmptyTrimmedString100,
  NonNegativeInt,
  NonNegativeFiniteNumber,
  sqliteFalse,
  sqliteTrue,
} from "@evolu/common";
import type { Data, Goal, Language, Prefill, Standards, TemplateItem, TemplateSet, Unit, Workout } from "../domain/model";
import { today } from "../domain/dates";
import {
  BodyWeightId,
  CustomExerciseId,
  DismissalId,
  ExerciseSettingsId,
  Json50k,
  SettingsId,
  TemplateId,
  Text1000,
  Text200,
  Text40,
  WorkoutExerciseId,
  WorkoutId,
  WorkoutSetId,
  type AppEvolu,
} from "./schema";

const int = (n: number) => NonNegativeInt.orThrow(Math.max(0, Math.round(n)));
const num = (n: number) => NonNegativeFiniteNumber.orThrow(Math.max(0, n));
const optNum = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : num(n));
const optInt = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : int(n));
const name100 = (s: string) => NonEmptyTrimmedString100.orThrow(s.trim().slice(0, 100) || "–");
const note = (s: string | null) => (s && s.trim() ? Text1000.orThrow(s.slice(0, 1000)) : null);

const settingsId = SettingsId.orThrow(createIdFromString("settings"));

export const createActions = (evolu: AppEvolu) => {
  const addSets = (workoutId: string, workoutExerciseId: string, exerciseKey: string, sets: readonly TemplateSet[], startPosition = 0) => {
    sets.forEach((s, i) =>
      evolu.insert("workoutSet", {
        workoutId: WorkoutId.orThrow(workoutId),
        workoutExerciseId: WorkoutExerciseId.orThrow(workoutExerciseId),
        exerciseKey: name100(exerciseKey),
        position: int(startPosition + i),
        weight: optNum(s.weight),
        reps: optInt(s.reps),
        duration: optInt(s.duration),
        distance: optNum(s.distance),
        done: sqliteFalse,
      }),
    );
  };

  const nextPosition = (workout: Workout) => workout.exercises.reduce((max, e) => Math.max(max, e.position + 1), 0);

  const insertExercise = (workoutId: string, exerciseKey: string, position: number, sets: readonly TemplateSet[]) => {
    const { id } = evolu.insert("workoutExercise", {
      workoutId: WorkoutId.orThrow(workoutId),
      exerciseKey: name100(exerciseKey),
      position: int(position),
    });
    addSets(workoutId, id, exerciseKey, sets.length > 0 ? sets : [{ weight: null, reps: null, duration: null, distance: null }]);
    return id;
  };

  return {
    startWorkout: (date: string = today(), templateId: string | null = null): string =>
      evolu.insert("workout", {
        date: Text40.orThrow(date),
        startedAt: int(Date.now()),
        templateId: templateId ? TemplateId.orThrow(templateId) : null,
      }).id,

    updateWorkout: (
      id: string,
      values: { date?: string; note?: string | null; finished?: boolean; templateId?: string | null; sleep?: number; energy?: number },
    ) =>
      evolu.update("workout", {
        id: WorkoutId.orThrow(id),
        ...(values.date !== undefined && { date: Text40.orThrow(values.date) }),
        ...(values.note !== undefined && { note: note(values.note) }),
        ...(values.finished !== undefined && { finishedAt: values.finished ? int(Date.now()) : null }),
        ...(values.templateId !== undefined && { templateId: values.templateId ? TemplateId.orThrow(values.templateId) : null }),
        ...(values.sleep !== undefined && { sleep: int(values.sleep) }),
        ...(values.energy !== undefined && { energy: int(values.energy) }),
      }),

    deleteWorkout: (workout: Workout) => {
      for (const e of workout.exercises) {
        for (const s of e.sets) evolu.update("workoutSet", { id: WorkoutSetId.orThrow(s.id), isDeleted: sqliteTrue });
        evolu.update("workoutExercise", { id: WorkoutExerciseId.orThrow(e.id), isDeleted: sqliteTrue });
      }
      evolu.update("workout", { id: WorkoutId.orThrow(workout.id), isDeleted: sqliteTrue });
    },

    addExercise: (workout: Workout, exerciseKey: string, sets: readonly TemplateSet[]) =>
      insertExercise(workout.id, exerciseKey, nextPosition(workout), sets),

    /** Copies exercises + set values from a template or earlier workout. */
    addItems: (workout: Workout, items: readonly TemplateItem[]) => {
      const start = nextPosition(workout);
      items.forEach((item, i) => insertExercise(workout.id, item.exerciseKey, start + i, item.sets));
    },

    updateExerciseNote: (id: string, text: string) =>
      evolu.update("workoutExercise", { id: WorkoutExerciseId.orThrow(id), note: note(text) }),

    moveExercise: (workout: Workout, id: string, direction: -1 | 1) => {
      const list = workout.exercises;
      const index = list.findIndex((e) => e.id === id);
      const other = list[index + direction];
      const self = list[index];
      if (!other || !self) return;
      // Re-number everything so equal positions from concurrent edits get fixed too.
      const reordered = [...list];
      reordered[index] = other;
      reordered[index + direction] = self;
      reordered.forEach((e, i) => evolu.update("workoutExercise", { id: WorkoutExerciseId.orThrow(e.id), position: int(i) }));
    },

    removeExercise: (workout: Workout, id: string) => {
      const e = workout.exercises.find((x) => x.id === id);
      if (!e) return;
      for (const s of e.sets) evolu.update("workoutSet", { id: WorkoutSetId.orThrow(s.id), isDeleted: sqliteTrue });
      evolu.update("workoutExercise", { id: WorkoutExerciseId.orThrow(id), isDeleted: sqliteTrue });
    },

    addSet: (workoutId: string, workoutExerciseId: string, exerciseKey: string, copyFrom: TemplateSet | undefined, position: number) =>
      addSets(
        workoutId,
        workoutExerciseId,
        exerciseKey,
        [copyFrom ?? { weight: null, reps: null, duration: null, distance: null }],
        position,
      ),

    updateSet: (id: string, values: Partial<TemplateSet> & { done?: boolean }) =>
      evolu.update("workoutSet", {
        id: WorkoutSetId.orThrow(id),
        ...("weight" in values && { weight: optNum(values.weight) }),
        ...("reps" in values && { reps: optInt(values.reps) }),
        ...("duration" in values && { duration: optInt(values.duration) }),
        ...("distance" in values && { distance: optNum(values.distance) }),
        ...(values.done !== undefined && { done: values.done ? sqliteTrue : sqliteFalse }),
      }),

    removeSet: (id: string) => evolu.update("workoutSet", { id: WorkoutSetId.orThrow(id), isDeleted: sqliteTrue }),

    saveTemplate: (data: Data, nameText: string, items: readonly TemplateItem[]) =>
      evolu.insert("template", {
        name: name100(nameText),
        position: int(data.templates.reduce((max, t) => Math.max(max, t.position + 1), 0)),
        items: Json50k.orThrow(JSON.stringify(items)),
      }).id,

    /** Saves a whole plan in order; optionally replaces all existing templates. */
    savePlan: (data: Data, plan: readonly { name: string; items: readonly TemplateItem[] }[], replace: boolean) => {
      if (replace) for (const t of data.templates) evolu.update("template", { id: TemplateId.orThrow(t.id), isDeleted: sqliteTrue });
      const start = replace ? 0 : data.templates.reduce((max, t) => Math.max(max, t.position + 1), 0);
      plan.forEach((p, i) =>
        evolu.insert("template", { name: name100(p.name), position: int(start + i), items: Json50k.orThrow(JSON.stringify(p.items)) }),
      );
    },

    renameTemplate: (id: string, nameText: string) => evolu.update("template", { id: TemplateId.orThrow(id), name: name100(nameText) }),

    reorderTemplates: (ids: readonly string[]) =>
      ids.forEach((id, i) => evolu.update("template", { id: TemplateId.orThrow(id), position: int(i) })),

    deleteTemplate: (id: string) => evolu.update("template", { id: TemplateId.orThrow(id), isDeleted: sqliteTrue }),

    createCustomExercise: (values: {
      name: string;
      equipment: string;
      metric: string;
      pattern: string;
      primary: string[];
      secondary: string[];
    }) =>
      evolu.insert("customExercise", {
        name: name100(values.name),
        equipment: Text40.orThrow(values.equipment),
        metric: Text40.orThrow(values.metric),
        pattern: Text40.orThrow(values.pattern),
        primary: Text200.orThrow(values.primary.join(",")),
        secondary: Text200.orThrow(values.secondary.join(",")),
      }).id,

    deleteCustomExercise: (id: string) => evolu.update("customExercise", { id: CustomExerciseId.orThrow(id), isDeleted: sqliteTrue }),

    /** One entry per day: re-entering a day overwrites it. */
    setBodyWeight: (date: string, kg: number) =>
      evolu.upsert("bodyWeight", {
        id: BodyWeightId.orThrow(createIdFromString(`bw-${date}`)),
        date: Text40.orThrow(date),
        weight: num(kg),
      }),

    deleteBodyWeight: (id: string) => evolu.update("bodyWeight", { id: BodyWeightId.orThrow(id), isDeleted: sqliteTrue }),

    updateSettings: (values: {
      goal?: Goal;
      unit?: Unit;
      language?: Language;
      restSeconds?: number;
      barWeight?: number;
      weeklyGoal?: number;
      standards?: Standards;
      prefill?: Prefill;
      deloadWeek?: string;
    }) =>
      evolu.upsert("settings", {
        id: settingsId,
        ...(values.goal && { goal: Text40.orThrow(values.goal) }),
        ...(values.unit && { unit: Text40.orThrow(values.unit) }),
        ...(values.language && { language: Text40.orThrow(values.language) }),
        ...(values.restSeconds !== undefined && { restSeconds: int(values.restSeconds) }),
        ...(values.barWeight !== undefined && { barWeight: num(values.barWeight) }),
        ...(values.weeklyGoal !== undefined && { weeklyGoal: int(values.weeklyGoal) }),
        ...(values.standards && { standards: Text40.orThrow(values.standards) }),
        ...(values.prefill && { prefill: Text40.orThrow(values.prefill) }),
        ...(values.deloadWeek && { deloadWeek: Text40.orThrow(values.deloadWeek) }),
      }),

    setExerciseGoal: (exerciseKey: string, goal: Goal | null) =>
      evolu.upsert("exerciseSettings", {
        id: ExerciseSettingsId.orThrow(createIdFromString(`ex-${exerciseKey}`)),
        exerciseKey: name100(exerciseKey),
        goal: goal ? Text40.orThrow(goal) : null,
      }),

    dismiss: (key: string, days: number) =>
      evolu.upsert("dismissal", {
        id: DismissalId.orThrow(createIdFromString(`dismiss-${key}`)),
        key: Text200.orThrow(key.slice(0, 200)),
        until: int(Date.now() + days * 86_400_000),
      }),
  };
};

export type Actions = ReturnType<typeof createActions>;
