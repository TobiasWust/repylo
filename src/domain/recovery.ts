/**
 * Muscle recovery and the daily "train or rest?" advice.
 *
 * Recovery is a deliberately simple model: the harder a muscle was worked in
 * one workout (direct sets count 1, secondary 0.5), the longer it needs –
 * 24 h for a little work, 48 h for a normal session, 72 h for a hard one.
 */
import { addDays, parseDay, toDay, weekStart } from "./dates";
import { muscles, type Muscle } from "./exercises";
import { getExercise, type Data, type Workout } from "./model";
import { hasValue, majorMuscles, trainedDays } from "./stats";

const majorMuscleSet: ReadonlySet<Muscle> = new Set(majorMuscles);

export interface MuscleRecovery {
  readonly muscle: Muscle;
  /** Hours until recovered; 0 = ready. */
  readonly hoursLeft: number;
  /** Day the muscle was last trained, if within the last few days. */
  readonly lastTrained: string | null;
}

const recoveryHours = (sets: number): number => (sets >= 6 ? 72 : sets >= 3 ? 48 : 24);

/** When a workout happened: its start time if logged live, otherwise late afternoon of its day. */
const workoutTime = (w: Workout): number =>
  w.startedAt > 0 && toDay(new Date(w.startedAt)) === w.date ? w.startedAt : parseDay(w.date).getTime() + 5 * 3_600_000;

export const muscleRecovery = (data: Data, now: number = Date.now()): MuscleRecovery[] => {
  const since = addDays(toDay(new Date(now)), -4);
  const readyAt = new Map<Muscle, number>();
  const last = new Map<Muscle, string>();
  for (const w of data.workouts) {
    if (w.date < since) continue;
    const load = new Map<Muscle, number>();
    for (const e of w.exercises) {
      const sets = e.sets.filter(hasValue).length;
      if (sets === 0) continue;
      const ex = getExercise(data, e.exerciseKey);
      for (const m of ex.primary) load.set(m, (load.get(m) ?? 0) + sets);
      for (const m of ex.secondary) load.set(m, (load.get(m) ?? 0) + sets * 0.5);
    }
    const time = workoutTime(w);
    for (const [m, sets] of load) {
      readyAt.set(m, Math.max(readyAt.get(m) ?? 0, time + recoveryHours(sets) * 3_600_000));
      if (!last.has(m) || w.date > last.get(m)!) last.set(m, w.date);
    }
  }
  return muscles.map((muscle) => ({
    muscle,
    hoursLeft: Math.max(0, Math.ceil(((readyAt.get(muscle) ?? 0) - now) / 3_600_000)),
    lastTrained: last.get(muscle) ?? null,
  }));
};

export type AdviceReason =
  | "done" // already trained today
  | "goalAtRisk" // the weekly goal needs today
  | "backToBack" // trained the last two days
  | "recovering" // most big muscles still recovering
  | "goalReached" // weekly goal already met – rest is fine
  | "fresh"; // recovered and the goal isn't met yet

export interface DailyAdvice {
  readonly train: boolean;
  readonly reason: AdviceReason;
  /** Big muscle groups that are ready, to point at a good focus for today. */
  readonly fresh: readonly Muscle[];
  /** Big muscle groups still recovering, with the longest wait first. */
  readonly tired: readonly MuscleRecovery[];
  /** Training days still needed this week (including today). */
  readonly needed: number;
}

export const dailyAdvice = (data: Data, now: number = Date.now()): DailyAdvice => {
  const day = toDay(new Date(now));
  const days = trainedDays(data);
  const recovery = muscleRecovery(data, now).filter((r) => majorMuscleSet.has(r.muscle));
  const fresh = recovery.filter((r) => r.hoursLeft === 0).map((r) => r.muscle);
  const tired = recovery.filter((r) => r.hoursLeft > 0).sort((a, b) => b.hoursLeft - a.hoursLeft);

  const monday = weekStart(day);
  const doneThisWeek = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => days.has(d) && d <= day).length;
  const needed = Math.max(0, data.settings.weeklyGoal - doneThisWeek);
  const daysLeft = 7 - Math.round((parseDay(day).getTime() - parseDay(monday).getTime()) / 86_400_000);

  const base = { fresh, tired, needed };
  if (days.has(day)) return { ...base, train: false, reason: "done" };
  if (needed > 0 && needed >= daysLeft) return { ...base, train: true, reason: "goalAtRisk" };
  if (days.has(addDays(day, -1)) && days.has(addDays(day, -2))) return { ...base, train: false, reason: "backToBack" };
  if (fresh.length < recovery.length / 2) return { ...base, train: false, reason: "recovering" };
  if (needed === 0) return { ...base, train: false, reason: "goalReached" };
  return { ...base, train: true, reason: "fresh" };
};
