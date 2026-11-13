/**
 * Your strength like a portfolio: every exercise is a position whose value
 * is its best est. 1RM per session (reps for bodyweight exercises, time for
 * timed ones). The strength index starts at 100 at the beginning of the
 * period and follows the average change of all exercises trained in it.
 */
import { addDays, toDay } from "./dates";
import { getExercise, type Data } from "./model";
import { exerciseSessions, type Session } from "./stats";

export type Period = "1w" | "1m" | "3m" | "1y" | "all";

const periodDays: Record<Exclude<Period, "all">, number> = { "1w": 7, "1m": 30, "3m": 91, "1y": 365 };

/** First day of a period ending today. */
export const periodStart = (data: Data, period: Period, now: number = Date.now()): string => {
  const today = toDay(new Date(now));
  if (period !== "all") return addDays(today, -(periodDays[period] - 1));
  return data.workouts.map((w) => w.date).sort()[0] ?? today;
};

export interface Position {
  readonly key: string;
  /** Latest value (kg, reps or seconds, see `unit`). */
  readonly current: number;
  readonly unit: "kg" | "reps" | "seconds";
  /** % change in the period; null when not trained in it. */
  readonly change: number | null;
  /** Values for a sparkline: start value, then each session in the period. */
  readonly trend: readonly number[];
  readonly sessions: number;
}

export interface StrengthIndex {
  readonly points: readonly { readonly date: string; readonly value: number }[];
  /** % change of the index over the period. */
  readonly change: number;
}

const valueOf = (metric: string, s: Session): number =>
  metric === "time" || metric === "cardio" ? s.maxDuration : s.bestE1rm > 0 ? s.bestE1rm : s.maxReps;

interface Line {
  readonly key: string;
  readonly unit: Position["unit"];
  readonly all: readonly { date: string; value: number }[];
  readonly base: number | null;
  readonly inRange: readonly { date: string; value: number }[];
}

const lines = (data: Data, from: string, to: string): Line[] => {
  const keys = new Set(data.workouts.filter((w) => w.date <= to).flatMap((w) => w.exercises.map((e) => e.exerciseKey)));
  const result: Line[] = [];
  for (const key of keys) {
    const metric = getExercise(data, key).metric;
    const all = exerciseSessions(data, key)
      .filter((s) => s.date <= to)
      .map((s) => ({ date: s.date, value: valueOf(metric, s), e1rm: s.bestE1rm }))
      .filter((s) => s.value > 0);
    if (all.length === 0) continue;
    const unit = metric === "time" || metric === "cardio" ? "seconds" : all.some((s) => s.e1rm > 0) ? "kg" : "reps";
    const inRange = all.filter((s) => s.date >= from);
    const before = all.filter((s) => s.date < from).at(-1);
    // New in the period: its first session is the starting point.
    const base = before?.value ?? (inRange.length >= 2 ? inRange[0]!.value : null);
    result.push({ key, unit, all, base, inRange });
  }
  return result;
};

export const positions = (data: Data, from: string, to: string): Position[] =>
  lines(data, from, to)
    .map((l): Position => {
      const current = l.all.at(-1)!.value;
      const last = l.inRange.at(-1);
      const change = l.base && last ? ((last.value - l.base) / l.base) * 100 : null;
      const trend = change !== null ? [l.base!, ...l.inRange.map((s) => s.value)] : l.all.slice(-12).map((s) => s.value);
      return { key: l.key, current, unit: l.unit, change, trend, sessions: l.inRange.length };
    })
    .sort((a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity) || b.sessions - a.sessions);

export const strengthIndex = (data: Data, from: string, to: string): StrengthIndex | null => {
  const active = lines(data, from, to).filter((l) => l.base && l.inRange.length > 0);
  if (active.length === 0) return null;
  const dates = [...new Set([from, ...active.flatMap((l) => l.inRange.map((s) => s.date)), to])].sort();
  const points = dates.map((date) => {
    const ratios = active.map((l) => {
      const latest = l.inRange.filter((s) => s.date <= date).at(-1);
      return (latest?.value ?? l.base!) / l.base!;
    });
    return { date, value: (100 * ratios.reduce((a, b) => a + b, 0)) / ratios.length };
  });
  return { points, change: points.at(-1)!.value - 100 };
};
