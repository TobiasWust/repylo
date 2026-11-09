import {
  id,
  maxLength,
  NonEmptyTrimmedString100,
  NonNegativeInt,
  NonNegativeFiniteNumber,
  nullOr,
  SqliteBoolean,
  String,
  type EvoluSchema,
} from "@evolu/common";
import { createQueryBuilder, type Evolu } from "@evolu/common/local-first";
import { createEvoluBinding } from "@evolu/react";

export const WorkoutId = id("Workout");
export type WorkoutId = typeof WorkoutId.Output;
export const WorkoutExerciseId = id("WorkoutExercise");
export type WorkoutExerciseId = typeof WorkoutExerciseId.Output;
export const WorkoutSetId = id("WorkoutSet");
export type WorkoutSetId = typeof WorkoutSetId.Output;
export const TemplateId = id("Template");
export type TemplateId = typeof TemplateId.Output;
export const CustomExerciseId = id("CustomExercise");
export const BodyWeightId = id("BodyWeight");
export type BodyWeightId = typeof BodyWeightId.Output;
export const SettingsId = id("Settings");
export const ExerciseSettingsId = id("ExerciseSettings");
export const DismissalId = id("Dismissal");

/** Every string column needs an upper bound so mutations stay small. */
export const Text1000 = maxLength(1000)(String);
export const Text200 = maxLength(200)(String);
export const Text40 = maxLength(40)(String);
/** Template contents as JSON. Templates are small, but give them room. */
export const Json50k = maxLength(50_000)(String);

export const Schema = {
  workout: {
    id: WorkoutId,
    /** Local calendar day, YYYY-MM-DD. */
    date: Text40,
    /** Epoch ms; orders workouts within a day. */
    startedAt: NonNegativeInt,
    finishedAt: nullOr(NonNegativeInt),
    note: nullOr(Text1000),
    templateId: nullOr(TemplateId),
  },
  workoutExercise: {
    id: WorkoutExerciseId,
    workoutId: WorkoutId,
    exerciseKey: NonEmptyTrimmedString100,
    position: NonNegativeInt,
    note: nullOr(Text1000),
  },
  workoutSet: {
    id: WorkoutSetId,
    workoutId: WorkoutId,
    workoutExerciseId: WorkoutExerciseId,
    // Denormalized so statistics don't need joins.
    exerciseKey: NonEmptyTrimmedString100,
    position: NonNegativeInt,
    /** Always stored in kg; converted for display. */
    weight: nullOr(NonNegativeFiniteNumber),
    reps: nullOr(NonNegativeInt),
    /** Seconds. */
    duration: nullOr(NonNegativeInt),
    /** Meters. */
    distance: nullOr(NonNegativeFiniteNumber),
    done: nullOr(SqliteBoolean),
  },
  template: {
    id: TemplateId,
    name: NonEmptyTrimmedString100,
    /** Order of templates defines the split rotation. */
    position: NonNegativeInt,
    items: Json50k,
  },
  customExercise: {
    id: CustomExerciseId,
    name: NonEmptyTrimmedString100,
    equipment: Text40,
    metric: Text40,
    pattern: Text40,
    /** Comma-separated muscle keys. */
    primary: Text200,
    secondary: Text200,
  },
  bodyWeight: {
    id: BodyWeightId,
    date: Text40,
    weight: NonNegativeFiniteNumber,
  },
  settings: {
    id: SettingsId,
    goal: nullOr(Text40),
    unit: nullOr(Text40),
    language: nullOr(Text40),
    restSeconds: nullOr(NonNegativeInt),
    barWeight: nullOr(NonNegativeFiniteNumber),
  },
  exerciseSettings: {
    id: ExerciseSettingsId,
    exerciseKey: NonEmptyTrimmedString100,
    goal: nullOr(Text40),
  },
  dismissal: {
    id: DismissalId,
    key: Text200,
    /** Epoch ms until which the suggestion stays hidden. */
    until: NonNegativeInt,
  },
} as const satisfies EvoluSchema;

export type AppSchema = typeof Schema;
export type AppEvolu = Evolu<AppSchema>;

export const { EvoluContext, useEvolu, useQueries, useOwnerSyncStatus } =
  createEvoluBinding<AppSchema>();

const createQuery = createQueryBuilder(Schema);

// The app loads all rows and derives everything in memory. Training logs are
// small (thousands of sets), and pure functions over plain arrays are far
// easier to test and reason about than many specialised SQL queries.
export const workoutsQuery = createQuery((db) =>
  db
    .selectFrom("workout")
    .select(["id", "date", "startedAt", "finishedAt", "note", "templateId"])
    .where("isDeleted", "is not", 1)
    .orderBy("startedAt", "desc"),
);
export const workoutExercisesQuery = createQuery((db) =>
  db
    .selectFrom("workoutExercise")
    .select(["id", "workoutId", "exerciseKey", "position", "note"])
    .where("isDeleted", "is not", 1),
);
export const setsQuery = createQuery((db) =>
  db
    .selectFrom("workoutSet")
    .select([
      "id",
      "workoutId",
      "workoutExerciseId",
      "exerciseKey",
      "position",
      "weight",
      "reps",
      "duration",
      "distance",
      "done",
    ])
    .where("isDeleted", "is not", 1),
);
export const templatesQuery = createQuery((db) =>
  db
    .selectFrom("template")
    .select(["id", "name", "position", "items"])
    .where("isDeleted", "is not", 1)
    .orderBy("position"),
);
export const customExercisesQuery = createQuery((db) =>
  db
    .selectFrom("customExercise")
    .select(["id", "name", "equipment", "metric", "pattern", "primary", "secondary"])
    .where("isDeleted", "is not", 1),
);
export const bodyWeightsQuery = createQuery((db) =>
  db
    .selectFrom("bodyWeight")
    .select(["id", "date", "weight"])
    .where("isDeleted", "is not", 1)
    .orderBy("date"),
);
export const settingsQuery = createQuery((db) =>
  db
    .selectFrom("settings")
    .select(["id", "goal", "unit", "language", "restSeconds", "barWeight"])
    .where("isDeleted", "is not", 1),
);
export const exerciseSettingsQuery = createQuery((db) =>
  db
    .selectFrom("exerciseSettings")
    .select(["id", "exerciseKey", "goal"])
    .where("isDeleted", "is not", 1),
);
export const dismissalsQuery = createQuery((db) =>
  db.selectFrom("dismissal").select(["id", "key", "until"]).where("isDeleted", "is not", 1),
);
