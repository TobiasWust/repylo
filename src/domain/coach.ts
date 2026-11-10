/**
 * Small, rule-based coaching messages: comparisons with the last session
 * and what to aim for next. The UI turns the structured result into text.
 */
import type { Data, SetEntry, TemplateSet } from "./model";
import { suggestProgression } from "./progression";
import { addDays, weekStart } from "./dates";
import { e1rm, exerciseSessions, hasValue, trainedDays } from "./stats";

export type SetFeedbackKind =
  | "heavier" // more weight than the same set last time
  | "moreReps" // same weight, more reps
  | "same" // matched last time
  | "fewerReps" // same weight, fewer reps
  | "lighter" // less weight
  | "first"; // nothing to compare with

export interface SetFeedback {
  readonly kind: SetFeedbackKind;
  /** Difference in reps (moreReps/fewerReps) or kg (heavier/lighter). */
  readonly delta: number;
  /** Target for the next set in this workout, if there is one. */
  readonly next: TemplateSet | null;
}

/**
 * Feedback for the latest done set of an exercise in a workout, compared
 * with the set at the same position last time (falling back to the last
 * set if this session has more sets than the previous one).
 */
export const setFeedback = (data: Data, workoutId: string, exerciseKey: string, sets: readonly SetEntry[]): SetFeedback | null => {
  let index = -1;
  sets.forEach((s, i) => {
    if (s.done && hasValue(s)) index = i;
  });
  const set = sets[index];
  if (!set) return null;

  const progression = suggestProgression(data, exerciseKey, workoutId);
  const nextIndex = index + 1;
  const next =
    nextIndex < sets.length && !sets[nextIndex]!.done ? (progression?.sets[nextIndex] ?? progression?.sets.at(-1) ?? null) : null;

  const last = exerciseSessions(data, exerciseKey, workoutId).at(-1);
  const previous = last?.sets[index] ?? last?.sets.at(-1);
  if (!previous) return { kind: "first", delta: 0, next };

  const weight = set.weight ?? 0,
    previousWeight = previous.weight ?? 0;
  const reps = set.reps ?? 0,
    previousReps = previous.reps ?? 0;
  // Time-based sets compare seconds as "reps".
  const amount = set.duration ?? reps,
    previousAmount = previous.duration ?? previousReps;

  if (weight > previousWeight + 0.01) return { kind: "heavier", delta: weight - previousWeight, next };
  if (weight < previousWeight - 0.01) return { kind: "lighter", delta: previousWeight - weight, next };
  if (amount > previousAmount) return { kind: "moreReps", delta: amount - previousAmount, next };
  if (amount < previousAmount) return { kind: "fewerReps", delta: previousAmount - amount, next };
  return { kind: "same", delta: 0, next };
};

export interface WorkoutSummary {
  readonly sets: number;
  /** kg × reps */
  readonly volume: number;
  /** Minutes, only for a workout finished on the day it started. */
  readonly minutes: number | null;
  /** Best est. 1RM vs. the previous session, biggest gains first. */
  readonly gains: readonly { exerciseKey: string; percent: number }[];
  /** Exercises with a new all-time best est. 1RM. */
  readonly records: readonly string[];
  /**
   * Average change of best est. 1RM vs. each exercise's previous session, in %,
   * over the exercises that have one; null if none do.
   */
  readonly averageChange: number | null;
  /** Name of the next split, if the workout came from a template rotation. */
  readonly nextTemplate: string | null;
  readonly daysThisWeek: number;
  readonly weeklyGoal: number;
}

export const workoutSummary = (data: Data, workoutId: string, now: number = Date.now()): WorkoutSummary | null => {
  const workout = data.workouts.find((w) => w.id === workoutId);
  if (!workout) return null;
  const sets = workout.exercises.flatMap((e) => e.sets.filter(hasValue));
  const volume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
  const elapsed = Math.round(((workout.finishedAt ?? now) - workout.startedAt) / 60_000);
  // Backfilled workouts have no meaningful start time; neither do overnight ones.
  const minutes = elapsed > 0 && elapsed <= 240 ? elapsed : null;

  const gains: { exerciseKey: string; percent: number }[] = [];
  const records: string[] = [];
  const changes: number[] = [];
  for (const entry of workout.exercises) {
    const current = Math.max(0, ...entry.sets.filter(hasValue).map((s) => e1rmOf(s)));
    const history = exerciseSessions(data, entry.exerciseKey, workoutId);
    const previous = history.at(-1)?.bestE1rm ?? 0;
    const best = Math.max(0, ...history.map((s) => s.bestE1rm));
    if (current > 0 && previous > 0) changes.push(((current - previous) / previous) * 100);
    if (current > 0 && previous > 0 && current > previous)
      gains.push({ exerciseKey: entry.exerciseKey, percent: ((current - previous) / previous) * 100 });
    if (current > 0 && best > 0 && current > best * 1.005) records.push(entry.exerciseKey);
  }
  gains.sort((a, b) => b.percent - a.percent);

  const index = data.templates.findIndex((t) => t.id === workout.templateId);
  const nextTemplate = index >= 0 && data.templates.length > 1 ? data.templates[(index + 1) % data.templates.length]!.name : null;

  const monday = weekStart(workout.date);
  const daysThisWeek = trainedDaysInWeek(data, monday);
  return {
    sets: sets.length,
    volume,
    minutes,
    gains: gains.slice(0, 3),
    records,
    averageChange: changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : null,
    nextTemplate,
    daysThisWeek,
    weeklyGoal: data.settings.weeklyGoal,
  };
};

const e1rmOf = (s: SetEntry) => e1rm(s.weight ?? 0, s.reps ?? 0);

const trainedDaysInWeek = (data: Data, monday: string): number => {
  const days = trainedDays(data);
  let count = 0;
  for (let i = 0; i < 7; i++) if (days.has(addDays(monday, i))) count++;
  return count;
};
