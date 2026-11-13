/**
 * Training level ("Trainingsstand"): a slow-moving average of your working
 * sets, the "fitness" half of the fitness–fatigue model (Banister et al.
 * 1975; TrainingPeaks calls it chronic training load). Each day it moves
 * 1/42 of the way towards that day's sets, so it climbs with regular
 * training and only slowly sinks in breaks – like a portfolio value that
 * moves every day. Shown as sets per week so the number means something.
 */
import { addDays, toDay } from "./dates";
import type { Data } from "./model";
import { hasValue } from "./stats";

const timeConstant = 42;

export interface FitnessDay {
  readonly date: string;
  /** Rolling working sets per week. */
  readonly level: number;
}

/** Daily values for the last `days` days up to today (oldest first); empty without any training. */
export const fitnessSeries = (data: Data, days = 90, now: number = Date.now()): FitnessDay[] => {
  const today = toDay(new Date(now));
  const load = new Map<string, number>();
  for (const w of data.workouts) {
    if (w.date > today) continue;
    const sets = w.exercises.reduce((n, e) => n + e.sets.filter(hasValue).length, 0);
    if (sets > 0) load.set(w.date, (load.get(w.date) ?? 0) + sets);
  }
  if (load.size === 0) return [];

  // Start early enough for the average to settle.
  const first = [...load.keys()].sort()[0]!;
  const warmUp = addDays(today, -(days + 3 * timeConstant));
  const from = addDays(today, -(days - 1));
  let level = 0;
  const result: FitnessDay[] = [];
  for (let day = first > warmUp ? first : warmUp; day <= today; day = addDays(day, 1)) {
    level += (load.get(day) ?? 0) - level / timeConstant;
    // `level` sums sets with a 42-day decay; ÷ 6 turns it into sets per week (42 days = 6 weeks).
    if (day >= from) result.push({ date: day, level: level / (timeConstant / 7) });
  }
  return result;
};
