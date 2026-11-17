/**
 * Rule-based training suggestions for the home screen, computed locally from
 * the user's own history. Each rule produces at most a few cards; the home
 * screen shows the top three by priority.
 */
import { balanceChecks, imbalances, trainsSide } from "./balance";
import { addDays, daysBetween, today, weekStart } from "./dates";
import { builtinExercises, type Muscle } from "./exercises";
import { comebackRule, insightDismissDays, insightRules } from "./insights";
import { pickExercises } from "./pick";
import { getExercise, type Data } from "./model";
import { exerciseSessions, hasValue, looksUnchecked, majorMuscles, setsPerMuscle, trainedDays, weeklySetTarget } from "./stats";

export type SuggestionKind =
  | "split"
  | "neglected"
  | "missing"
  | "imbalance"
  | "plateau"
  | "deload"
  | "comeback"
  | "overVolume"
  | "crammed"
  | "similar"
  | "variety"
  | "stretch"
  | "easy"
  | "repRange"
  | "order"
  | "jump"
  | "long"
  | "unchecked";

export interface Suggestion {
  /** Stable identity used for dismissing. */
  readonly key: string;
  readonly kind: SuggestionKind;
  readonly priority: number;
  readonly exerciseKeys: readonly string[];
  readonly templateId?: string;
  /** Values the UI interpolates into the card text. */
  readonly params: Readonly<Record<string, string | number>>;
  /** A hint to read, not exercises to add: the card's button just acknowledges it. */
  readonly info?: boolean;
}

/** How long a swiped-away suggestion stays hidden. */
export const dismissDays = 4;

/**
 * After one suggestion is swiped away, the home screen stays quiet this long
 * instead of showing the next one right away.
 */
export const homePauseKey = "home-pause";
export const homePauseDays = 1;

/**
 * Muscles trained hard (≥ 3 direct sets) today or yesterday. They need ~48 h,
 * so we don't suggest exercises that hit them as a primary mover.
 */
export const recoveringMuscles = (data: Data, now: string): Set<Muscle> => {
  const recent = setsPerMuscle(data, addDays(now, -1), now);
  const result = new Set<Muscle>();
  for (const w of data.workouts) {
    if (w.date < addDays(now, -1)) continue;
    for (const e of w.exercises) {
      const count = e.sets.filter(hasValue).length;
      if (count === 0) continue;
      for (const m of getExercise(data, e.exerciseKey).primary) if ((recent.get(m) ?? 0) >= 3) result.add(m);
    }
  }
  return result;
};

const splitRule = (data: Data, now: string): Suggestion[] => {
  if (data.templates.length < 2) return [];
  const todays = data.workouts.find((w) => w.date === now);
  if (todays?.templateId) return [];
  const lastFromTemplate = data.workouts.find((w) => w.templateId && data.templates.some((t) => t.id === w.templateId));
  const lastIndex = lastFromTemplate ? data.templates.findIndex((t) => t.id === lastFromTemplate.templateId) : -1;
  const next = data.templates[(lastIndex + 1) % data.templates.length]!;
  return [
    {
      key: `split:${next.id}:${lastFromTemplate?.date ?? ""}`,
      kind: "split",
      priority: 95,
      exerciseKeys: next.items.map((i) => i.exerciseKey),
      templateId: next.id,
      params: { name: next.name, last: lastFromTemplate ? (data.templates[lastIndex]?.name ?? "") : "" },
    },
  ];
};

const neglectedRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => {
  const workoutCount = data.workouts.filter((w) => w.exercises.some((e) => e.sets.some(hasValue))).length;
  // Weekly averages are meaningless before there are two weeks of data.
  const first = data.workouts.at(-1)?.date;
  if (workoutCount < 3 || !first || daysBetween(first, now) < 10) return [];
  const last7 = setsPerMuscle(data, addDays(now, -6), now);
  const last14 = setsPerMuscle(data, addDays(now, -13), now);
  const [target] = weeklySetTarget[data.settings.goal];
  return majorMuscles
    .filter((m) => !recovering.has(m))
    .map((m) => ({ muscle: m, weekly: Math.max(last7.get(m) ?? 0, (last14.get(m) ?? 0) / 2) }))
    .filter(({ weekly }) => weekly < target)
    .sort((a, b) => a.weekly - b.weekly)
    .slice(0, 2)
    .map(({ muscle, weekly }) => ({
      key: `neglected:${muscle}`,
      kind: "neglected" as const,
      priority: 70 + (1 - weekly / target) * 20,
      // Exercises led by this muscle: a Turkish get-up lists abs, but it's no ab exercise.
      exerciseKeys: pickExercises(data, (e) => e.primary[0] === muscle, recovering, 2),
      params: { muscle, sets: Math.round(weekly), target },
    }))
    .filter((s) => s.exerciseKeys.length > 0);
};

const missingRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => {
  const missing: { key: string; days: number }[] = [];
  const keys = new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseKey)));
  for (const key of keys) {
    const sessions = exerciseSessions(data, key);
    if (sessions.length < 3) continue;
    const days = daysBetween(sessions.at(-1)!.date, now);
    const span = daysBetween(sessions[0]!.date, sessions.at(-1)!.date);
    const averageGap = span / (sessions.length - 1);
    // "Regularly" = at least every two weeks; gone for 18+ days, but not abandoned for months.
    const ex = getExercise(data, key);
    if (averageGap <= 14 && days >= 18 && days <= 120 && !ex.primary.some((m) => recovering.has(m))) missing.push({ key, days });
  }
  if (missing.length === 0) return [];
  missing.sort((a, b) => a.days - b.days);
  const top = missing.slice(0, 3);
  return [
    {
      key: `missing:${top
        .map((m) => m.key)
        .sort()
        .join(",")}`,
      kind: "missing",
      priority: 60 + Math.min(top[0]!.days, 60) / 6,
      exerciseKeys: top.map((m) => m.key),
      params: { days: top[0]!.days, exercise: top[0]!.key },
    },
  ];
};

const imbalanceRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] =>
  imbalances(balanceChecks(data, 14, now)).flatMap((c) => {
    const side = c.weaker!;
    const exerciseKeys = pickExercises(data, trainsSide(c.key, side), recovering, 2);
    if (exerciseKeys.length === 0) return [];
    return [
      {
        key: `imbalance:${c.key}:${side}`,
        kind: "imbalance" as const,
        priority: 65 + Math.min(c.factor, 4) * 3,
        exerciseKeys,
        params: { pair: c.key, side, left: Math.round(c.left), right: Math.round(c.right) },
      },
    ];
  });

const plateauRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => {
  const result: Suggestion[] = [];
  const windowStart = addDays(now, -28);
  for (const ex of data.exercises.values()) {
    if (ex.metric !== "weight" || ex.primary.some((m) => recovering.has(m))) continue;
    // Plateau = the all-time best (est. 1RM) is 4+ weeks old, despite at
    // least 3 sessions since. Tiny gains (< 0.5 %) don't count as progress.
    const sessions = exerciseSessions(data, ex.key);
    let bestIndex = -1;
    sessions.forEach((s, i) => {
      if (bestIndex < 0 || s.bestE1rm > sessions[bestIndex]!.bestE1rm * 1.005) bestIndex = i;
    });
    const best = sessions[bestIndex];
    const since = sessions.length - 1 - bestIndex;
    if (!best || best.date >= windowStart || since < 3 || sessions.at(-1)!.date < addDays(now, -14)) continue;
    const recent = sessions.slice(bestIndex + 1);
    const variant =
      ex.variants.find((v) => data.exercises.has(v)) ??
      builtinExercises.find((b) => b.key !== ex.key && b.primary[0] === ex.primary[0] && b.metric === "weight")?.key;
    if (!variant) continue;
    result.push({
      key: `plateau:${ex.key}`,
      kind: "plateau",
      priority: 55 + recent.length,
      exerciseKeys: [variant],
      params: { exercise: ex.key, variant, weeks: 4 },
    });
  }
  return result.sort((a, b) => b.priority - a.priority).slice(0, 1);
};

/** After this many training weeks in a row, a planned easier week helps recovery. */
const deloadAfterWeeks = 6;

/**
 * Consecutive weeks with training, counted back from last week and stopping
 * at the last planned deload week.
 */
export const weeksSinceDeload = (data: Data, now: string): number => {
  const perWeek = new Set([...trainedDays(data)].map(weekStart));
  let week = addDays(weekStart(now), -7);
  let count = 0;
  while (perWeek.has(week) && week !== data.settings.deloadWeek) {
    count++;
    week = addDays(week, -7);
  }
  return count;
};

const deloadRule = (data: Data, now: string): Suggestion[] => {
  const weeks = weeksSinceDeload(data, now);
  if (weeks < deloadAfterWeeks || data.settings.deloadWeek === weekStart(now)) return [];
  return [{ key: `deload:${weekStart(now)}`, kind: "deload", priority: 93, exerciseKeys: [], params: { weeks } }];
};

/** Recent workouts that may never have happened (see `looksUnchecked`): ask before they skew the stats. */
const uncheckedRule = (data: Data, now: string): Suggestion[] =>
  data.workouts
    .filter((w) => w.date >= addDays(now, -13) && looksUnchecked(w))
    .slice(0, 1)
    .map((w) => ({
      key: `unchecked:${w.id}`,
      kind: "unchecked" as const,
      priority: 96,
      exerciseKeys: [],
      params: { workoutId: w.id, date: w.date },
    }));

const notDismissed = (data: Data, nowMs: number) => (s: Suggestion) => (data.dismissedUntil.get(s.key) ?? 0) < nowMs;

/** Every current home-screen suggestion, best first, without the dismissed ones. */
export const allSuggestions = (data: Data, nowMs: number = Date.now(), now: string = today()): Suggestion[] => {
  const recovering = recoveringMuscles(data, now);
  return [
    ...uncheckedRule(data, now),
    ...comebackRule(data, now),
    ...deloadRule(data, now),
    ...splitRule(data, now),
    ...neglectedRule(data, now, recovering),
    ...missingRule(data, now, recovering),
    ...imbalanceRule(data, now, recovering),
    ...plateauRule(data, now, recovering),
  ]
    .filter(notDismissed(data, nowMs))
    .sort((a, b) => b.priority - a.priority);
};

/**
 * The one coaching tip for the summary after a workout: the most important
 * insight not shown in the last two weeks. Showing it counts as seen (see
 * `coachTipDismissDays`), so the next workout brings the next one.
 */
export const coachTip = (data: Data, nowMs: number = Date.now(), now: string = today()): Suggestion | null =>
  insightRules(data, now, recoveringMuscles(data, now))
    .filter(notDismissed(data, nowMs))
    .sort((a, b) => b.priority - a.priority)[0] ?? null;

/** How long a tip rests after it was shown. */
export const coachTipDismissDays = insightDismissDays;

export const computeSuggestions = (data: Data, nowMs: number = Date.now(), now: string = today()): Suggestion[] =>
  allSuggestions(data, nowMs, now).slice(0, 3);
