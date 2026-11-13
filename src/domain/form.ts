/**
 * "Form": the fitness–fatigue model (Banister et al. 1975), the same idea
 * as TrainingPeaks' fitness / fatigue / form. Every training day adds load
 * to two running averages:
 *
 * - fitness builds slowly and lasts (time constant 42 days),
 * - fatigue rises fast and fades fast (7 days).
 *
 * Form = fitness − fatigue. It drops right after training and climbs on rest
 * days, because fatigue fades faster than fitness – so it moves every day.
 * Load is the number of working sets; a simplification that works well
 * enough as a daily trend, not a precise measure of strength.
 */
import { addDays, toDay } from "./dates";
import type { Data } from "./model";
import { hasValue } from "./stats";

const fitnessDays = 42;
const fatigueDays = 7;

export interface FormDay {
  readonly date: string;
  readonly fitness: number;
  readonly fatigue: number;
  readonly form: number;
}

export type FormLevel = "fresh" | "balanced" | "building" | "strained";

/** Daily values for the last `days` days up to today (oldest first); empty without any training. */
export const formSeries = (data: Data, days = 30, now: number = Date.now()): FormDay[] => {
  const today = toDay(new Date(now));
  const load = new Map<string, number>();
  for (const w of data.workouts) {
    if (w.date > today) continue;
    const sets = w.exercises.reduce((n, e) => n + e.sets.filter(hasValue).length, 0);
    if (sets > 0) load.set(w.date, (load.get(w.date) ?? 0) + sets);
  }
  if (load.size === 0) return [];

  // Start early enough for the slow average to settle.
  const first = [...load.keys()].sort()[0]!;
  const warmUp = addDays(today, -(days + 3 * fitnessDays));
  let day = first > warmUp ? first : warmUp;
  const from = addDays(today, -(days - 1));
  let fitness = 0,
    fatigue = 0;
  const result: FormDay[] = [];
  for (; day <= today; day = addDays(day, 1)) {
    const l = load.get(day) ?? 0;
    fitness += (l - fitness) / fitnessDays;
    fatigue += (l - fatigue) / fatigueDays;
    if (day >= from) result.push({ date: day, fitness, fatigue, form: fitness - fatigue });
  }
  return result;
};

/** Rough reading of form relative to fitness. */
export const formLevel = (d: FormDay): FormLevel => {
  const ratio = d.form / Math.max(d.fitness, 1);
  return ratio > 0.05 ? "fresh" : ratio >= -0.15 ? "balanced" : ratio >= -0.5 ? "building" : "strained";
};
