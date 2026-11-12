/**
 * Progression suggestions using "double progression":
 *
 * 1. Stay at a weight and add reps until every set reaches the top of the
 *    goal's rep range.
 * 2. Then raise the weight so the bottom of the range takes about the same
 *    effort as the top did (Epley: 12 → 8 reps ≈ +10 %), rounded down to the
 *    equipment's increments and at least one increment. Dropping four reps
 *    but adding only one small step (1 kg on 50 kg) would leave every set far
 *    from failure; ACSM suggests 2–10 % jumps once the target is beaten.
 * How the exercise felt last time (one tap: easy / right / at the limit)
 * tunes both steps. Proximity to failure is what drives hypertrophy (Refalo
 * et al. 2023, Robinson et al. 2024), so "easy" counts as about three more
 * reps in the tank: two reps more next time, or straight to more weight.
 * "At the limit" jumps a little more carefully.
 *
 * 3. Deload (~90 %) when performance (estimated 1RM) dropped three sessions
 *    in a row, or when the last two sessions stayed below the rep range in
 *    every set — the weight is too heavy for now.
 *
 * Everything runs locally from the user's own history.
 */
import { incrementKg, incrementLb } from "./exercises";
import { getExercise, goalFor, type Data, type Goal, type TemplateSet } from "./model";
import { exerciseSessions, type Session } from "./stats";
import { fromUnit, toUnit } from "./units";
import { today, weekStart } from "./dates";
import { readinessOf } from "./readiness";

export const repRange: Record<Goal, readonly [number, number]> = {
  strength: [3, 6],
  hypertrophy: [8, 12],
  endurance: [15, 20],
};

export type ProgressionKind = "addWeight" | "addReps" | "repeat" | "deload" | "addTime";

export interface Progression {
  readonly kind: ProgressionKind;
  readonly sets: readonly TemplateSet[];
  readonly last: Session;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Reps the user could have done beyond what they logged, by how it felt. */
const repsInReserve = (effort: number | null): number => (effort === 1 ? 3 : effort === 3 ? -1 : 0);

/**
 * Weight for `min` reps after reaching `reps` at `top`, by the Epley ratio.
 * Reps beyond the range count up to five extra; the jump is capped at 20 %.
 */
export const nextWeight = (top: number, reps: number, [min, max]: readonly [number, number], inc: number): number => {
  const ratio = Math.min(1.2, (1 + Math.min(reps, max + 5) / 30) / (1 + min / 30));
  const steps = Math.max(1, Math.floor((top * ratio - top) / inc + 1e-9));
  return top + steps * inc;
};

const isDeclining = (sessions: readonly Session[]): boolean => {
  if (sessions.length < 4) return false;
  const recent = sessions.slice(-4).map((s) => s.bestE1rm);
  return recent[0]! > recent[1]! && recent[1]! > recent[2]! && recent[2]! > recent[3]!;
};

/** Is `day` inside the deload week the user started? */
export const isDeloadWeek = (data: Data, day: string = today()): boolean => data.settings.deloadWeek === weekStart(day);

export const suggestProgression = (data: Data, exerciseKey: string, beforeWorkoutId?: string): Progression | null => {
  const sessions = exerciseSessions(data, exerciseKey, beforeWorkoutId);
  const last = sessions.at(-1);
  if (!last) return null;
  const exercise = getExercise(data, exerciseKey);
  const unit = data.settings.unit;
  const copy = (s: TemplateSet): TemplateSet => ({ weight: s.weight, reps: s.reps, duration: s.duration, distance: s.distance });

  if (exercise.metric === "time") {
    return { kind: "addTime", last, sets: last.sets.map((s) => ({ ...copy(s), duration: (s.duration ?? 0) + 5 })) };
  }
  if (exercise.metric === "cardio") {
    return { kind: "repeat", last, sets: last.sets.map(copy) };
  }

  const [min, max] = repRange[goalFor(data, exerciseKey)];
  const top = last.topWeight;
  const inc = unit === "kg" ? incrementKg[exercise.equipment] : incrementLb[exercise.equipment];
  const step = unit === "kg" ? 0.5 : 1;

  // A planned deload week (~90 % weight, one set fewer) or a day with poor
  // readiness (sleep + energy): go lighter on purpose instead of grinding.
  const workout = data.workouts.find((w) => w.id === beforeWorkoutId);
  const day = workout?.date ?? today();
  if ((isDeloadWeek(data, day) || (workout && readinessOf(workout) === "low")) && top > 0) {
    const weight = fromUnit(roundTo(toUnit(top, unit) * 0.9, step), unit);
    const sets = last.sets.slice(0, Math.max(2, last.sets.length - 1));
    return { kind: "deload", last, sets: sets.map((s) => ({ ...copy(s), weight, reps: min })) };
  }

  const belowRange = (session: Session | undefined) => !!session && session.sets.every((s) => (s.reps ?? 0) < min);
  const stuckBelowRange = belowRange(last) && belowRange(sessions.at(-2)) && sessions.at(-2)!.topWeight >= top;
  if ((isDeclining(sessions) || stuckBelowRange) && top > 0) {
    const weight = fromUnit(roundTo(toUnit(top, unit) * 0.9, step), unit);
    return { kind: "deload", last, sets: last.sets.map((s) => ({ ...copy(s), weight, reps: Math.round((min + max) / 2) })) };
  }

  const reserve = repsInReserve(last.effort);
  const topSets = last.sets.filter((s) => (s.weight ?? 0) >= top);
  const allAtMax = topSets.length > 0 && topSets.every((s) => (s.reps ?? 0) + Math.max(0, reserve) >= max);
  if (allAtMax) {
    const reps = Math.min(...topSets.map((s) => s.reps ?? 0)) + reserve;
    const weight = fromUnit(roundTo(nextWeight(toUnit(top, unit), reps, [min, max], inc), step), unit);
    return { kind: "addWeight", last, sets: last.sets.map((s) => ({ ...copy(s), weight, reps: min })) };
  }

  const anyBelowMax = last.sets.some((s) => (s.reps ?? 0) < max);
  if (anyBelowMax) {
    // Add a rep (two if it felt easy) to every set below the top, keeping weight.
    const add = reserve > 0 ? 2 : 1;
    return {
      kind: "addReps",
      last,
      sets: last.sets.map((s) => ({ ...copy(s), reps: Math.min(max, (s.reps ?? 0) + add) })),
    };
  }
  return { kind: "repeat", last, sets: last.sets.map(copy) };
};
