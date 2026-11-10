/**
 * Rule-based training suggestions for the home screen, computed locally from
 * the user's own history. Each rule produces at most a few cards; the home
 * screen shows the top three by priority.
 */
import { addDays, daysBetween, today, weekStart } from "./dates";
import { builtinExercises, type Exercise, type Muscle } from "./exercises";
import { getExercise, type Data } from "./model";
import { exerciseSessions, hasValue, majorMuscles, setsPerMuscle, trainedDays, weeklySetTarget } from "./stats";

export type SuggestionKind = "split" | "neglected" | "missing" | "imbalance" | "plateau" | "deload";

export interface Suggestion {
  /** Stable identity used for dismissing. */
  readonly key: string;
  readonly kind: SuggestionKind;
  readonly priority: number;
  readonly exerciseKeys: readonly string[];
  readonly templateId?: string;
  /** Values the UI interpolates into the card text. */
  readonly params: Readonly<Record<string, string | number>>;
}

/** How long a swiped-away suggestion stays hidden. */
export const dismissDays = 4;

/** How often each exercise was done (sessions), as a preference signal. */
const usageCounts = (data: Data): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const w of data.workouts)
    for (const e of w.exercises) if (e.sets.some(hasValue)) counts.set(e.exerciseKey, (counts.get(e.exerciseKey) ?? 0) + 1);
  return counts;
};

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

/** Best exercises for a predicate: the user's favourites first, then the library. */
const pickExercises = (data: Data, matches: (e: Exercise) => boolean, recovering: ReadonlySet<Muscle>, count: number): string[] => {
  const usage = usageCounts(data);
  const candidates = [...data.exercises.values()].filter(
    (e) => matches(e) && e.metric !== "cardio" && !e.primary.some((m) => recovering.has(m)),
  );
  // Without history, prefer the general library over specialised machines.
  const libraryRank = (e: Exercise) => (e.equipment === "egym" ? 1 : 0);
  candidates.sort((a, b) => (usage.get(b.key) ?? 0) - (usage.get(a.key) ?? 0) || libraryRank(a) - libraryRank(b));
  return candidates.slice(0, count).map((e) => e.key);
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
      exerciseKeys: pickExercises(data, (e) => e.primary.includes(muscle), recovering, 2),
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
      key: `missing:${top.map((m) => m.key).sort().join(",")}`,
      kind: "missing",
      priority: 60 + Math.min(top[0]!.days, 60) / 6,
      exerciseKeys: top.map((m) => m.key),
      params: { days: top[0]!.days, exercise: top[0]!.key },
    },
  ];
};

const imbalanceRule = (data: Data, now: string, recovering: ReadonlySet<Muscle>): Suggestion[] => {
  const from = addDays(now, -13);
  let push = 0, pull = 0;
  for (const w of data.workouts) {
    if (w.date < from) continue;
    for (const e of w.exercises) {
      const n = e.sets.filter(hasValue).length;
      const pattern = getExercise(data, e.exerciseKey).pattern;
      if (pattern === "push") push += n;
      if (pattern === "pull") pull += n;
    }
  }
  const result: Suggestion[] = [];
  const ratioCard = (key: string, more: number, less: number, target: (e: Exercise) => boolean, params: Record<string, string | number>) => {
    if (more < 6 || more <= less * 1.5) return;
    const exerciseKeys = pickExercises(data, target, recovering, 2);
    if (exerciseKeys.length === 0) return;
    result.push({ key, kind: "imbalance", priority: 65 + Math.min(more / Math.max(less, 1), 4) * 3, exerciseKeys, params: { ...params, more: Math.round(more), less: Math.round(less) } });
  };
  ratioCard("imbalance:pull", push, pull, (e) => e.pattern === "pull", { side: "pull" });
  ratioCard("imbalance:push", pull, push, (e) => e.pattern === "push", { side: "push" });
  const muscles = setsPerMuscle(data, from, now);
  const quads = muscles.get("quads") ?? 0, hams = muscles.get("hamstrings") ?? 0;
  ratioCard("imbalance:hamstrings", quads, hams, (e) => e.primary.includes("hamstrings"), { side: "hamstrings" });
  ratioCard("imbalance:quads", hams, quads, (e) => e.primary.includes("quads"), { side: "quads" });
  return result;
};

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

export const computeSuggestions = (data: Data, nowMs: number = Date.now(), now: string = today()): Suggestion[] => {
  const recovering = recoveringMuscles(data, now);
  return [
    ...deloadRule(data, now),
    ...splitRule(data, now),
    ...neglectedRule(data, now, recovering),
    ...missingRule(data, now, recovering),
    ...imbalanceRule(data, now, recovering),
    ...plateauRule(data, now, recovering),
  ]
    .filter((s) => (data.dismissedUntil.get(s.key) ?? 0) < nowMs)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
};
