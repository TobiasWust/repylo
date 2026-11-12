/**
 * Monthly review: a compact summary of one calendar month, compared with
 * everything before it. Months are "YYYY-MM".
 */
import { addDays, today } from "./dates";
import type { Data } from "./model";
import { daysPerWeek, exerciseSessions, hasValue, strengthChange, trainedDays } from "./stats";

export interface MonthlyReview {
  readonly month: string;
  readonly workouts: number;
  readonly trainingDays: number;
  readonly sets: number;
  /** Average est. 1RM change over the month's exercises, in %. */
  readonly strength: number | null;
  /** Weeks (starting in this month) in which the weekly goal was reached. */
  readonly goalWeeks: number;
  readonly weeks: number;
  readonly favorite: { readonly exerciseKey: string; readonly sessions: number } | null;
  /** Exercise with the largest gain in best est. 1RM vs. before this month. */
  readonly biggestGain: { readonly exerciseKey: string; readonly percent: number } | null;
  /** Number of exercises with a new best est. 1RM this month. */
  readonly records: number;
  /** kg, first vs last weigh-in of the month. */
  readonly bodyWeightChange: number | null;
}

const inMonth = (date: string, month: string) => date.startsWith(month);

export const previousMonth = (month: string): string => {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** Months that have at least one workout, newest first. */
export const reviewMonths = (data: Data): string[] => [...new Set(data.workouts.map((w) => w.date.slice(0, 7)))].sort().reverse();

export const monthlyReview = (data: Data, month: string): MonthlyReview => {
  const workouts = data.workouts.filter((w) => inMonth(w.date, month) && w.exercises.some((e) => e.sets.some(hasValue)));
  const sets = workouts.flatMap((w) => w.exercises.flatMap((e) => e.sets.filter(hasValue)));
  const strength = strengthChange(data, `${month}-01`, `${month}-31`)?.percent ?? null;

  const perWeek = daysPerWeek(trainedDays(data));
  const mondays: string[] = [];
  for (let day = `${month}-01`; inMonth(day, month); day = addDays(day, 1)) {
    if (new Date(`${day}T12:00`).getDay() === 1 && day <= today()) mondays.push(day);
  }
  const goalWeeks = mondays.filter((m) => (perWeek.get(m) ?? 0) >= data.settings.weeklyGoal).length;

  const counts = new Map<string, number>();
  for (const w of workouts)
    for (const e of w.exercises) if (e.sets.some(hasValue)) counts.set(e.exerciseKey, (counts.get(e.exerciseKey) ?? 0) + 1);
  const favoriteEntry = [...counts].sort((a, b) => b[1] - a[1])[0];

  let biggestGain: MonthlyReview["biggestGain"] = null;
  let records = 0;
  for (const key of counts.keys()) {
    const sessions = exerciseSessions(data, key);
    const before = Math.max(0, ...sessions.filter((s) => s.date < `${month}-01`).map((s) => s.bestE1rm));
    const during = Math.max(0, ...sessions.filter((s) => inMonth(s.date, month)).map((s) => s.bestE1rm));
    if (before <= 0 || during <= before * 1.005) continue;
    records++;
    const percent = ((during - before) / before) * 100;
    if (!biggestGain || percent > biggestGain.percent) biggestGain = { exerciseKey: key, percent };
  }

  const weights = data.bodyWeights.filter((b) => inMonth(b.date, month));
  const bodyWeightChange = weights.length >= 2 ? weights.at(-1)!.weight - weights[0]!.weight : null;

  return {
    month,
    workouts: workouts.length,
    trainingDays: new Set(workouts.map((w) => w.date)).size,
    sets: sets.length,
    strength,
    goalWeeks,
    weeks: mondays.length,
    favorite: favoriteEntry ? { exerciseKey: favoriteEntry[0], sessions: favoriteEntry[1] } : null,
    biggestGain,
    records,
    bodyWeightChange,
  };
};
