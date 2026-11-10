/**
 * Small, rule-based coaching messages: comparisons with the last session
 * and what to aim for next. The UI turns the structured result into text.
 */
import type { Data, SetEntry, TemplateSet } from "./model";
import { suggestProgression } from "./progression";
import { exerciseSessions, hasValue } from "./stats";

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
  const next = nextIndex < sets.length && !sets[nextIndex]!.done ? (progression?.sets[nextIndex] ?? progression?.sets.at(-1) ?? null) : null;

  const last = exerciseSessions(data, exerciseKey, workoutId).at(-1);
  const previous = last?.sets[index] ?? last?.sets.at(-1);
  if (!previous) return { kind: "first", delta: 0, next };

  const weight = set.weight ?? 0, previousWeight = previous.weight ?? 0;
  const reps = set.reps ?? 0, previousReps = previous.reps ?? 0;
  // Time-based sets compare seconds as "reps".
  const amount = set.duration ?? reps, previousAmount = previous.duration ?? previousReps;

  if (weight > previousWeight + 0.01) return { kind: "heavier", delta: weight - previousWeight, next };
  if (weight < previousWeight - 0.01) return { kind: "lighter", delta: previousWeight - weight, next };
  if (amount > previousAmount) return { kind: "moreReps", delta: amount - previousAmount, next };
  if (amount < previousAmount) return { kind: "fewerReps", delta: previousAmount - amount, next };
  return { kind: "same", delta: 0, next };
};
