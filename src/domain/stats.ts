import { addDays, daysBetween, today, weekStart } from "./dates";
import { minorMuscles, muscles, type Muscle } from "./exercises";
import { getExercise, type Data, type SetEntry, type Workout } from "./model";

export const hasValue = (s: SetEntry): boolean => (s.reps ?? 0) > 0 || (s.duration ?? 0) > 0 || (s.distance ?? 0) > 0;

/**
 * Estimated one-rep max (Epley). Above ~12 reps the estimate gets unreliable,
 * so we clamp the rep count; that understates very light sets, which is the
 * safer direction for progression decisions.
 */
export const e1rm = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + Math.min(reps, 12) / 30);
};

export interface Session {
  readonly workoutId: string;
  readonly date: string;
  readonly note: string | null;
  /** How the exercise felt that day (see WorkoutExercise.effort). */
  readonly effort: number | null;
  readonly sets: readonly SetEntry[];
  readonly topWeight: number;
  readonly bestE1rm: number;
  /** kg × reps */
  readonly volume: number;
  readonly maxReps: number;
  readonly totalReps: number;
  readonly maxDuration: number;
  readonly totalDuration: number;
  readonly totalDistance: number;
}

const summarize = (workoutId: string, date: string, note: string | null, effort: number | null, sets: SetEntry[]): Session => {
  let topWeight = 0,
    bestE1rm = 0,
    volume = 0,
    maxReps = 0,
    totalReps = 0;
  let maxDuration = 0,
    totalDuration = 0,
    totalDistance = 0;
  for (const s of sets) {
    const w = s.weight ?? 0,
      r = s.reps ?? 0,
      d = s.duration ?? 0;
    if (r > 0) topWeight = Math.max(topWeight, w);
    bestE1rm = Math.max(bestE1rm, e1rm(w, r));
    volume += w * r;
    maxReps = Math.max(maxReps, r);
    totalReps += r;
    maxDuration = Math.max(maxDuration, d);
    totalDuration += d;
    totalDistance += s.distance ?? 0;
  }
  return {
    workoutId,
    date,
    note,
    effort,
    sets,
    topWeight,
    bestE1rm,
    volume,
    maxReps,
    totalReps,
    maxDuration,
    totalDuration,
    totalDistance,
  };
};

/**
 * All sessions of one exercise, oldest first.
 *
 * With `beforeWorkoutId`, only sessions that happened before that workout
 * count. That keeps "last time", progression and PRs correct when editing a
 * backfilled workout from weeks ago: later workouts are its future, not its
 * history. A workout not yet in `data` (just created) only excludes itself.
 */
export const exerciseSessions = (data: Data, key: string, beforeWorkoutId?: string): Session[] => {
  const anchor = data.workouts.find((w) => w.id === beforeWorkoutId);
  const isBefore = (w: Workout) => !anchor || w.date < anchor.date || (w.date === anchor.date && w.startedAt < anchor.startedAt);
  const sessions: Session[] = [];
  for (let i = data.workouts.length - 1; i >= 0; i--) {
    const w = data.workouts[i]!;
    if (w.id === beforeWorkoutId || !isBefore(w)) continue;
    const sets = w.exercises.filter((e) => e.exerciseKey === key).flatMap((e) => e.sets.filter(hasValue));
    const note = w.exercises.find((e) => e.exerciseKey === key && e.note)?.note ?? null;
    const effort = w.exercises.find((e) => e.exerciseKey === key && e.effort)?.effort ?? null;
    if (sets.length > 0) sessions.push(summarize(w.id, w.date, note, effort, sets));
  }
  return sessions;
};

export interface Records {
  readonly maxWeight: number;
  readonly bestE1rm: number;
  readonly bestVolume: number;
  readonly maxReps: number;
  readonly maxDuration: number;
  readonly maxDistance: number;
  /** Heaviest weight lifted for exactly n reps. */
  readonly byReps: ReadonlyMap<number, number>;
}

export const records = (sessions: readonly Session[]): Records => {
  let maxWeight = 0,
    bestE1rm = 0,
    bestVolume = 0,
    maxReps = 0,
    maxDuration = 0,
    maxDistance = 0;
  const byReps = new Map<number, number>();
  for (const s of sessions) {
    maxWeight = Math.max(maxWeight, s.topWeight);
    bestE1rm = Math.max(bestE1rm, s.bestE1rm);
    bestVolume = Math.max(bestVolume, s.volume);
    maxReps = Math.max(maxReps, s.maxReps);
    maxDuration = Math.max(maxDuration, s.maxDuration);
    maxDistance = Math.max(maxDistance, s.totalDistance);
    for (const set of s.sets) {
      const r = set.reps ?? 0,
        w = set.weight ?? 0;
      if (r > 0 && r <= 20 && w > 0) byReps.set(r, Math.max(byReps.get(r) ?? 0, w));
    }
  }
  // Keep only real records: "8 × 65 kg" is no record if 10 × 65 kg exists.
  for (const [reps, weight] of byReps) {
    for (const [moreReps, other] of byReps) if (moreReps > reps && other >= weight) byReps.delete(reps);
  }
  return { maxWeight, bestE1rm, bestVolume, maxReps, maxDuration, maxDistance, byReps };
};

export type PrKind = "weight" | "e1rm" | "reps" | "duration" | "volume";
export interface Pr {
  readonly kind: PrKind;
  readonly value: number;
}

/**
 * Which records does this set (or its session) break, compared with all
 * other workouts? Requires at least one earlier session, so a first-ever
 * set isn't celebrated as a "record".
 */
export const detectPrs = (data: Data, workoutId: string, set: SetEntry): Pr[] => {
  const history = exerciseSessions(data, set.exerciseKey, workoutId);
  if (history.length === 0) return [];
  const best = records(history);
  const prs: Pr[] = [];
  const w = set.weight ?? 0,
    r = set.reps ?? 0,
    d = set.duration ?? 0;
  const metric = getExercise(data, set.exerciseKey).metric;
  if (metric === "weight" || (metric === "bodyweight" && w > 0)) {
    if (w > best.maxWeight && r > 0) prs.push({ kind: "weight", value: w });
    else if (e1rm(w, r) > best.bestE1rm + 0.01) prs.push({ kind: "e1rm", value: e1rm(w, r) });
  }
  if (metric === "bodyweight" && w === 0 && r > best.maxReps) prs.push({ kind: "reps", value: r });
  if ((metric === "time" || metric === "cardio") && d > best.maxDuration) prs.push({ kind: "duration", value: d });

  const current = data.workouts.find((x) => x.id === workoutId);
  if (current && metric === "weight") {
    const sets = current.exercises.filter((e) => e.exerciseKey === set.exerciseKey).flatMap((e) => e.sets.filter(hasValue));
    const volume = sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
    if (volume > best.bestVolume && prs.length === 0) prs.push({ kind: "volume", value: volume });
  }
  return prs;
};

/**
 * Hard sets per muscle within [from, to]. A primary muscle counts a full set,
 * a secondary muscle half a set — the common convention for weekly volume.
 */
export const setsPerMuscle = (data: Data, from: string, to: string = today()): Map<Muscle, number> => {
  const result = new Map<Muscle, number>(muscles.map((m) => [m, 0]));
  for (const w of data.workouts) {
    if (w.date < from || w.date > to) continue;
    for (const e of w.exercises) {
      const ex = getExercise(data, e.exerciseKey);
      const count = e.sets.filter(hasValue).length;
      for (const m of ex.primary) result.set(m, (result.get(m) ?? 0) + count);
      for (const m of ex.secondary) result.set(m, (result.get(m) ?? 0) + count * 0.5);
    }
  }
  return result;
};

/** Weekly working-set targets per goal (lower and upper bound). */
export const weeklySetTarget = { strength: [6, 12], hypertrophy: [10, 20], endurance: [6, 15] } as const;

export const majorMuscles = muscles.filter((m) => !minorMuscles.has(m));

export const trainedDays = (data: Data): Set<string> =>
  new Set(data.workouts.filter((w) => w.exercises.some((e) => e.sets.some(hasValue))).map((w) => w.date));

/** Training days per week (keyed by Monday). */
export const daysPerWeek = (days: ReadonlySet<string>): Map<string, number> => {
  const result = new Map<string, number>();
  for (const day of days) result.set(weekStart(day), (result.get(weekStart(day)) ?? 0) + 1);
  return result;
};

/**
 * Consecutive weeks (Mon–Sun) in which the weekly goal was reached. The
 * current week counts once the goal is met, but doesn't break the streak
 * while it is still open.
 */
export const weekStreak = (days: ReadonlySet<string>, goal = 1): number => {
  const perWeek = daysPerWeek(days);
  const reached = (week: string) => (perWeek.get(week) ?? 0) >= goal;
  let week = weekStart(today());
  if (!reached(week)) week = addDays(week, -7);
  let streak = 0;
  while (reached(week)) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
};

export interface WeekVolume {
  readonly week: string;
  readonly volume: number;
  readonly sets: number;
  readonly workouts: number;
}

export const weeklyVolume = (data: Data, weeks: number): WeekVolume[] => {
  const start = addDays(weekStart(today()), -7 * (weeks - 1));
  const map = new Map<string, { volume: number; sets: number; workouts: number }>();
  for (let i = 0; i < weeks; i++) map.set(addDays(start, 7 * i), { volume: 0, sets: 0, workouts: 0 });
  for (const w of data.workouts) {
    const entry = map.get(weekStart(w.date));
    if (!entry) continue;
    const sets = w.exercises.flatMap((e) => e.sets.filter(hasValue));
    if (sets.length === 0) continue;
    entry.workouts++;
    entry.sets += sets.length;
    entry.volume += sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
  }
  return [...map].map(([week, v]) => ({ week, ...v }));
};

/**
 * How much stronger you got between `from` and `to`: per exercise, the best
 * est. 1RM of its last session in the range against its last session before
 * the range (or, if it's new, its first session in the range), averaged over
 * all exercises with two such sessions. Tonnage would mostly measure how
 * heavy the machines are; this measures progress.
 */
export const strengthChange = (data: Data, from: string, to: string): { percent: number; exercises: number } | null => {
  const keys = new Set(data.workouts.filter((w) => w.date >= from && w.date <= to).flatMap((w) => w.exercises.map((e) => e.exerciseKey)));
  const changes: number[] = [];
  for (const key of keys) {
    const sessions = exerciseSessions(data, key).filter((s) => s.bestE1rm > 0 && s.date <= to);
    const inRange = sessions.filter((s) => s.date >= from);
    const baseline = sessions.filter((s) => s.date < from).at(-1) ?? inRange[0];
    const current = inRange.at(-1);
    if (!baseline || !current || baseline === current) continue;
    changes.push(((current.bestE1rm - baseline.bestE1rm) / baseline.bestE1rm) * 100);
  }
  if (changes.length === 0) return null;
  return { percent: changes.reduce((a, b) => a + b, 0) / changes.length, exercises: changes.length };
};

/** Body weight on or before `date` (latest entry), if any. */
export const bodyWeightAt = (data: Data, date: string): number | null => {
  let result: number | null = null;
  for (const b of data.bodyWeights) {
    if (b.date > date) break;
    result = b.weight;
  }
  return result;
};

/** Trailing 7-day average, smoothing out daily water-weight noise. */
export const bodyWeightTrend = (data: Data): { date: string; weight: number; trend: number }[] =>
  data.bodyWeights.map((b) => {
    const window = data.bodyWeights.filter((x) => x.date <= b.date && daysBetween(x.date, b.date) < 7);
    const trend = window.reduce((sum, x) => sum + x.weight, 0) / window.length;
    return { date: b.date, weight: b.weight, trend };
  });

/** The most recent PRs across all exercises, newest first (for the stats feed). */
export const recentPrs = (data: Data, limit: number): { date: string; exerciseKey: string; kind: PrKind; value: number }[] => {
  const result: { date: string; exerciseKey: string; kind: PrKind; value: number }[] = [];
  const keys = new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseKey)));
  for (const key of keys) {
    if (getExercise(data, key).metric !== "weight") continue;
    let best = 0;
    let first = true;
    for (const s of exerciseSessions(data, key)) {
      if (s.bestE1rm > best + 0.01 && !first) result.push({ date: s.date, exerciseKey: key, kind: "e1rm", value: s.bestE1rm });
      best = Math.max(best, s.bestE1rm);
      first = false;
    }
  }
  return result.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
};

/**
 * Average workouts per week over the last completed weeks, starting no
 * earlier than the week of the first workout (a newcomer isn't averaged over
 * weeks before they started). The running week is left out because it isn't
 * over yet – unless it is the only week so far.
 */
export const workoutsPerWeek = (data: Data, maxWeeks = 12, now: string = today()): { average: number; weeks: number } | null => {
  const dates = data.workouts.filter((w) => w.exercises.some((e) => e.sets.some(hasValue))).map((w) => w.date);
  if (dates.length === 0) return null;
  const first = weekStart(dates.reduce((a, b) => (a < b ? a : b)));
  const current = weekStart(now);
  const lastComplete = addDays(current, -7);
  const end = first > lastComplete ? current : lastComplete;
  const weeks = Math.min(maxWeeks, Math.round(daysBetween(first, end) / 7) + 1);
  const from = addDays(end, -7 * (weeks - 1));
  const until = addDays(end, 6);
  const count = dates.filter((d) => d >= from && d <= until).length;
  return { average: count / weeks, weeks };
};
