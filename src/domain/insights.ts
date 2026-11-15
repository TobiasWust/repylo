/**
 * Coaching insights: patterns in the user's training that research says are
 * worth changing. Each rule is deliberately conservative – it only speaks up
 * when the pattern is clear in the data, and the UI explains the evidence.
 *
 * - overVolume: far more weekly sets for a muscle than the goal's range.
 *   Gains flatten out with volume (Schoenfeld et al. 2017; Pelland et al. 2024).
 * - crammed: most of a muscle's week in a single session. Volume-equated,
 *   frequency barely matters (Schoenfeld et al. 2019), so spreading it costs
 *   nothing and keeps each session fresher.
 * - similar: several near-identical exercises in one workout.
 * - variety: a muscle only ever trained with one kind of movement. Varied
 *   exercise selection grows muscles more evenly (Fonseca et al. 2014;
 *   Kassiano et al. 2022).
 * - stretch: no exercise that loads the muscle long (see `lengthened`).
 * - easy: most exercises felt easy. Proximity to failure drives growth
 *   (Refalo et al. 2023; Robinson et al. 2024).
 * - repRange: reps don't fit the goal. Strength needs heavy loads; growth
 *   works across ~6–30 reps near failure (Schoenfeld et al. 2017; Lopez et al. 2021).
 * - order: the main strength lift keeps coming late. Exercises done first
 *   gain more strength (Nunes et al. 2021).
 * - comeback: back after 3+ weeks off. Strength holds about three weeks
 *   (Bosquet et al. 2013) and returns quickly (Ogasawara et al. 2013).
 */
import { addDays, daysBetween, weekStart } from "./dates";
import type { Muscle } from "./exercises";
import { goalFor, getExercise, type Data, type Workout } from "./model";
import { compoundMovements, lengthened, movementOf, variedMovements, type Movement } from "./movement";
import { pickExercises } from "./pick";
import { exerciseSessions, hasValue, majorMuscles, setsPerMuscle, weeklySetTarget, workoutTimes } from "./stats";
import type { Suggestion } from "./suggestions";

/** Info cards stay away longer once acknowledged: the pattern won't change overnight. */
export const insightDismissDays = 14;

const logged = (w: Workout) => w.exercises.some((e) => e.sets.some(hasValue));

const workoutsSince = (data: Data, from: string, now: string): Workout[] =>
  data.workouts.filter((w) => w.date >= from && w.date <= now && logged(w));

/** Enough history for weekly patterns to mean something. */
const established = (data: Data, now: string): boolean => {
  const all = data.workouts.filter(logged);
  return all.length >= 4 && daysBetween(all.at(-1)!.date, now) >= 10;
};

/** Sets per muscle in one workout: direct 1, secondary ½ (as in `setsPerMuscle`). */
const workoutMuscleSets = (data: Data, w: Workout): Map<Muscle, number> => {
  const result = new Map<Muscle, number>();
  for (const e of w.exercises) {
    const ex = getExercise(data, e.exerciseKey);
    const count = e.sets.filter(hasValue).length;
    for (const m of ex.primary) result.set(m, (result.get(m) ?? 0) + count);
    for (const m of ex.secondary) result.set(m, (result.get(m) ?? 0) + count * 0.5);
  }
  return result;
};

const info = (key: string, kind: Suggestion["kind"], priority: number, params: Suggestion["params"], exerciseKeys: string[] = []) =>
  ({ key, kind, priority, params, exerciseKeys, info: true }) satisfies Suggestion;

export const overVolumeRule = (data: Data, now: string): Suggestion[] => {
  if (!established(data, now)) return [];
  const [, upper] = weeklySetTarget[data.settings.goal];
  // Clearly above the range, not just a busy week.
  const limit = Math.round(upper * 1.3);
  const week = setsPerMuscle(data, addDays(now, -6), now);
  const top = majorMuscles
    .map((m) => ({ muscle: m, sets: week.get(m) ?? 0 }))
    .filter((x) => x.sets > limit)
    .sort((a, b) => b.sets - a.sets)[0];
  if (!top) return [];
  return [info(`overVolume:${top.muscle}`, "overVolume", 68, { muscle: top.muscle, sets: Math.round(top.sets), upper })];
};

export const crammedRule = (data: Data, now: string): Suggestion[] => {
  const recent = workoutsSince(data, addDays(now, -13), now);
  for (const w of recent) {
    for (const [muscle, sets] of workoutMuscleSets(data, w)) {
      if (!majorMuscles.includes(muscle) || sets < 12) continue;
      // Only if that one session is most of the muscle's week.
      const week = setsPerMuscle(data, addDays(w.date, -3), addDays(w.date, 3)).get(muscle) ?? 0;
      if (sets >= week * 0.75) return [info(`crammed:${muscle}:${w.date}`, "crammed", 62, { muscle, sets: Math.round(sets) })];
    }
  }
  return [];
};

export const similarRule = (data: Data, now: string): Suggestion[] => {
  const recent = workoutsSince(data, addDays(now, -6), now);
  for (const w of recent) {
    const groups = new Map<Movement, string[]>();
    for (const e of w.exercises) {
      const movement = movementOf(e.exerciseKey);
      if (!movement || variedMovements.has(movement) || !e.sets.some(hasValue)) continue;
      groups.set(movement, [...(groups.get(movement) ?? []), e.exerciseKey]);
    }
    for (const [movement, keys] of groups) {
      const unique = [...new Set(keys)];
      if (unique.length < (compoundMovements.has(movement) ? 3 : 2)) continue;
      const muscle = getExercise(data, unique[0]!).primary[0];
      if (!muscle) continue;
      const done = new Set(w.exercises.map((e) => e.exerciseKey));
      const instead = pickExercises(
        data,
        (e) => e.primary.includes(muscle) && !done.has(e.key) && movementOf(e.key) !== null && movementOf(e.key) !== movement,
        new Set(),
        2,
      );
      return [
        info(
          `similar:${unique.sort().join(",")}`,
          "similar",
          60,
          { first: unique[0]!, second: unique[1]!, count: unique.length, muscle },
          instead,
        ),
      ];
    }
  }
  return [];
};

/**
 * Muscles where studies compared exercise variants and found regional
 * differences. Upper back, abs and calves are left out: there the library's
 * alternatives (shrugs, carries, …) wouldn't be a better pick.
 */
const varietyMuscles: readonly Muscle[] = ["chest", "shoulders", "lats", "quads", "hamstrings", "glutes", "biceps", "triceps"];

// Variety and stretch are about which exercises you pick, not about training
// today, so they speak up even while the muscle recovers. The card then
// becomes a note (no "add to today") until the muscle is ready.
export const varietyRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => {
  if (!established(data, now)) return [];
  const recent = workoutsSince(data, addDays(now, -27), now);
  const result: Suggestion[] = [];
  for (const muscle of varietyMuscles) {
    let sets = 0;
    const movements = new Set<Movement | null>();
    for (const w of recent)
      for (const e of w.exercises) {
        const count = e.sets.filter(hasValue).length;
        if (count === 0 || !getExercise(data, e.exerciseKey).primary.includes(muscle)) continue;
        sets += count;
        movements.add(movementOf(e.exerciseKey));
      }
    const only = movements.size === 1 ? [...movements][0] : null;
    if (!only || sets < 8 || variedMovements.has(only)) continue;
    const exerciseKeys = pickExercises(
      data,
      (e) =>
        e.primary[0] === muscle && movementOf(e.key) !== null && movementOf(e.key) !== only && !variedMovements.has(movementOf(e.key)!),
      new Set(),
      2,
    );
    if (exerciseKeys.length > 0)
      result.push({
        key: `variety:${muscle}:${only}`,
        kind: "variety",
        priority: 58,
        exerciseKeys,
        params: { muscle },
        ...(recovering.has(muscle) && { info: true }),
      });
  }
  return result.slice(0, 1);
};

export const stretchRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => {
  if (!established(data, now)) return [];
  const recent = workoutsSince(data, addDays(now, -27), now);
  const result: Suggestion[] = [];
  for (const [muscle, long] of Object.entries(lengthened) as [Muscle, ReadonlySet<string>][]) {
    let sets = 0;
    let usesLong = false;
    let main: string | null = null;
    for (const w of recent)
      for (const e of w.exercises) {
        const count = e.sets.filter(hasValue).length;
        if (count === 0 || !getExercise(data, e.exerciseKey).primary.includes(muscle)) continue;
        sets += count;
        main ??= e.exerciseKey;
        if (long.has(e.exerciseKey)) usesLong = true;
      }
    if (usesLong || sets < 6 || !main) continue;
    const exerciseKeys = pickExercises(data, (e) => long.has(e.key), new Set(), 2);
    if (exerciseKeys.length > 0)
      result.push({
        key: `stretch:${muscle}`,
        kind: "stretch",
        priority: 59,
        exerciseKeys,
        params: { muscle, exercise: main },
        ...(recovering.has(muscle) && { info: true }),
      });
  }
  return result.slice(0, 1);
};

export const easyRule = (data: Data, now: string): Suggestion[] => {
  const rated = workoutsSince(data, addDays(now, -27), now)
    .flatMap((w) => w.exercises)
    .filter((e) => e.effort !== null);
  const easy = rated.filter((e) => e.effort === 1).length;
  if (rated.length < 6 || easy / rated.length < 0.6) return [];
  return [info("easy", "easy", 64, { easy, total: rated.length })];
};

export const repRangeRule = (data: Data, now: string): Suggestion[] => {
  const recent = workoutsSince(data, addDays(now, -27), now);
  const strength: number[] = [];
  const growth: number[] = [];
  for (const w of recent)
    for (const e of w.exercises) {
      const ex = getExercise(data, e.exerciseKey);
      const movement = movementOf(e.exerciseKey);
      if (ex.metric !== "weight") continue;
      const reps = e.sets.filter(hasValue).map((s) => s.reps ?? 0);
      const goal = goalFor(data, e.exerciseKey);
      // Strength is about the big lifts; small exercises can stay lighter.
      if (goal === "strength" && movement && compoundMovements.has(movement)) strength.push(...reps);
      if (goal === "hypertrophy") growth.push(...reps);
    }
  if (strength.length >= 12 && strength.filter((r) => r <= 6).length / strength.length < 0.25)
    return [info("repRange:strength", "repRange", 63, { goal: "strength" })];
  // Very light loads (30+ reps) grow muscle less reliably (Lasevicius et al. 2018).
  if (growth.length >= 12 && growth.filter((r) => r > 30).length / growth.length >= 0.5)
    return [info("repRange:hypertrophy", "repRange", 63, { goal: "hypertrophy" })];
  return [];
};

const isIsolation = (key: string) => {
  const m = movementOf(key);
  return m !== null && !compoundMovements.has(m);
};

/**
 * A big lift that keeps coming late. For strength goals: after two or more
 * small exercises in the last three sessions (Nunes et al. 2021). For other
 * goals order matters little for growth, so only when it lands in the last
 * quarter of long workouts (10+ exercises), where fatigue costs reps
 * (Simão et al. 2012).
 */
export const orderRule = (data: Data, now: string): Suggestion[] => {
  const recent = workoutsSince(data, addDays(now, -41), now);
  const keys = new Set(recent.flatMap((w) => w.exercises.map((e) => e.exerciseKey)));
  for (const key of keys) {
    const movement = movementOf(key);
    if (!movement || !compoundMovements.has(movement)) continue;
    const strength = goalFor(data, key) === "strength";
    const sessions = recent
      .filter((w) => w.exercises.some((e) => e.exerciseKey === key && e.sets.some(hasValue)))
      .slice(0, strength ? 3 : 2);
    if (sessions.length < (strength ? 3 : 2)) continue;
    const late = sessions.every((w) => {
      const list = w.exercises.filter((e) => e.sets.some(hasValue));
      const index = list.findIndex((e) => e.exerciseKey === key);
      if (strength) return list.slice(0, index).filter((e) => isIsolation(e.exerciseKey)).length >= 2;
      return list.length >= 10 && index >= list.length * 0.75;
    });
    if (late) {
      const before = sessions[0]!.exercises.filter((e) => e.sets.some(hasValue)).findIndex((e) => e.exerciseKey === key);
      return [info(`order:${key}`, "order", 57, { exercise: key, goal: strength ? "strength" : "growth", before })];
    }
  }
  return [];
};

/**
 * Estimated 1RM jumping 15 %+ from one session to the next on several
 * exercises at once. Real strength doesn't grow that fast; the estimate only
 * works for sets close to failure, so the earlier sets were far from it.
 * Deload and comeback sessions are light on purpose and don't count.
 */
export const jumpRule = (data: Data, now: string): Suggestion[] => {
  const latest = workoutsSince(data, addDays(now, -13), now)[0];
  if (!latest) return [];
  const jumps: { key: string; percent: number }[] = [];
  for (const e of latest.exercises) {
    if (getExercise(data, e.exerciseKey).metric !== "weight") continue;
    const sessions = exerciseSessions(data, e.exerciseKey);
    const index = sessions.findIndex((s) => s.workoutId === latest.id);
    const current = sessions[index];
    const previous = sessions[index - 1];
    if (!current || !previous || previous.bestE1rm <= 0 || daysBetween(previous.date, current.date) > 14) continue;
    if (data.settings.deloadWeek === weekStart(previous.date) || (breakBefore(data, previous.date) ?? 0) >= comebackDays) continue;
    const percent = Math.round((current.bestE1rm / previous.bestE1rm - 1) * 100);
    if (percent >= 15) jumps.push({ key: e.exerciseKey, percent });
  }
  if (jumps.length < 3) return [];
  const top = jumps.sort((a, b) => b.percent - a.percent)[0]!;
  return [
    info(`jump:${latest.date}`, "jump", 66, {
      count: jumps.length,
      exercise: top.key,
      percent: top.percent,
      rated: data.settings.effortCheck ? 1 : 0,
    }),
  ];
};

/**
 * Most recent live workouts lasting 90+ minutes with 40+ sets. Spread over
 * more, shorter sessions the weekly volume (what drives growth) stays the
 * same (Schoenfeld et al. 2019), and late sets don't suffer from fatigue.
 */
export const longRule = (data: Data, now: string): Suggestion[] => {
  const timed = workoutsSince(data, addDays(now, -27), now)
    .map((w) => ({ w, times: workoutTimes(w) }))
    .filter((x) => x.times?.end != null)
    .slice(0, 3);
  const long = timed.filter(({ w, times }) => {
    const minutes = (times!.end! - times!.start) / 60_000;
    const sets = w.exercises.reduce((n, e) => n + e.sets.filter(hasValue).length, 0);
    return minutes >= 90 && sets >= 40;
  });
  if (long.length < 2) return [];
  const minutes = Math.round(long.reduce((n, { times }) => n + (times!.end! - times!.start) / 60_000, 0) / long.length);
  const sets = Math.round(
    long.reduce((n, { w }) => n + w.exercises.reduce((m, e) => m + e.sets.filter(hasValue).length, 0), 0) / long.length,
  );
  return [info(`long:${long[0]!.w.date}`, "long", 61, { minutes, sets })];
};

/** Days without any training before `day` (null without earlier training). */
export const breakBefore = (data: Data, day: string, excludeWorkoutId?: string): number | null => {
  const last = data.workouts.find((w) => w.id !== excludeWorkoutId && w.date < day && logged(w));
  return last ? daysBetween(last.date, day) : null;
};

/** Training pause after which the first sessions should start lighter. */
export const comebackDays = 21;

export const comebackRule = (data: Data, now: string): Suggestion[] => {
  const gap = breakBefore(data, now);
  if (gap === null || gap < comebackDays || data.workouts.filter(logged).length < 4) return [];
  const last = addDays(now, -gap);
  return [info(`comeback:${last}`, "comeback", 97, { weeks: Math.floor(gap / 7) })];
};

export const insightRules = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => [
  ...comebackRule(data, now),
  ...overVolumeRule(data, now),
  ...easyRule(data, now),
  ...repRangeRule(data, now),
  ...crammedRule(data, now),
  ...similarRule(data, now),
  ...stretchRule(data, now, recovering),
  ...varietyRule(data, now, recovering),
  ...orderRule(data, now),
  ...jumpRule(data, now),
  ...longRule(data, now),
];

/** Kinds that come from these rules, e.g. for the coach card in Stats. */
export const insightKinds: ReadonlySet<Suggestion["kind"]> = new Set([
  "comeback",
  "overVolume",
  "easy",
  "repRange",
  "crammed",
  "similar",
  "stretch",
  "variety",
  "order",
  "jump",
  "long",
]);
