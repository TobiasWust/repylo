import { addDays, daysBetween, today, weekStart } from "./dates";
import { minorMuscles, muscles, type Muscle } from "./exercises";
import { getExercise, type Data, type SetEntry, type Workout } from "./model";

export const hasValue = (s: SetEntry): boolean =>
  (s.reps ?? 0) > 0 || (s.duration ?? 0) > 0 || (s.distance ?? 0) > 0;

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

const summarize = (workoutId: string, date: string, note: string | null, sets: SetEntry[]): Session => {
  let topWeight = 0, bestE1rm = 0, volume = 0, maxReps = 0, totalReps = 0;
  let maxDuration = 0, totalDuration = 0, totalDistance = 0;
  for (const s of sets) {
    const w = s.weight ?? 0, r = s.reps ?? 0, d = s.duration ?? 0;
    if (r > 0) topWeight = Math.max(topWeight, w);
    bestE1rm = Math.max(bestE1rm, e1rm(w, r));
    volume += w * r;
    maxReps = Math.max(maxReps, r);
    totalReps += r;
    maxDuration = Math.max(maxDuration, d);
    totalDuration += d;
    totalDistance += s.distance ?? 0;
  }
  return { workoutId, date, note, sets, topWeight, bestE1rm, volume, maxReps, totalReps, maxDuration, totalDuration, totalDistance };
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
  const isBefore = (w: Workout) =>
    !anchor || w.date < anchor.date || (w.date === anchor.date && w.startedAt < anchor.startedAt);
  const sessions: Session[] = [];
  for (let i = data.workouts.length - 1; i >= 0; i--) {
    const w = data.workouts[i]!;
    if (w.id === beforeWorkoutId || !isBefore(w)) continue;
    const sets = w.exercises.filter((e) => e.exerciseKey === key).flatMap((e) => e.sets.filter(hasValue));
    const note = w.exercises.find((e) => e.exerciseKey === key && e.note)?.note ?? null;
    if (sets.length > 0) sessions.push(summarize(w.id, w.date, note, sets));
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
  let maxWeight = 0, bestE1rm = 0, bestVolume = 0, maxReps = 0, maxDuration = 0, maxDistance = 0;
  const byReps = new Map<number, number>();
  for (const s of sessions) {
    maxWeight = Math.max(maxWeight, s.topWeight);
    bestE1rm = Math.max(bestE1rm, s.bestE1rm);
    bestVolume = Math.max(bestVolume, s.volume);
    maxReps = Math.max(maxReps, s.maxReps);
    maxDuration = Math.max(maxDuration, s.maxDuration);
    maxDistance = Math.max(maxDistance, s.totalDistance);
    for (const set of s.sets) {
      const r = set.reps ?? 0, w = set.weight ?? 0;
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
  const w = set.weight ?? 0, r = set.reps ?? 0, d = set.duration ?? 0;
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

export const trainedDays = (data: Data): Set<string> => new Set(data.workouts.filter((w) => w.exercises.some((e) => e.sets.some(hasValue))).map((w) => w.date));

/** Consecutive weeks (Mon–Sun) with at least one workout. The current week counts once trained, but doesn't break the streak while still open. */
export const weekStreak = (days: ReadonlySet<string>): number => {
  const weeks = new Set([...days].map(weekStart));
  let week = weekStart(today());
  if (!weeks.has(week)) week = addDays(week, -7);
  let streak = 0;
  while (weeks.has(week)) {
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
