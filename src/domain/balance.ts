/**
 * Muscle balance: compares opposing sides (push vs pull, quads vs hamstrings,
 * …) over the last two weeks and reports only the pairs that are off.
 */
import { addDays, today } from "./dates";
import type { Exercise, Muscle } from "./exercises";
import { getExercise, type Data } from "./model";
import { hasValue, setsPerMuscle } from "./stats";

export type BalanceKey = "pushPull" | "quadsHamstrings" | "frontRearDelts" | "bicepsTriceps" | "absLowerBack" | "upperLower";

interface PairSpec {
  readonly key: BalanceKey;
  readonly left: readonly Muscle[] | "push";
  readonly right: readonly Muscle[] | "pull";
  /** Healthy left:right ratio in sets. */
  readonly ideal: number;
  /** How far off (as a factor) is still fine. Small muscles get more leeway. */
  readonly tolerance: number;
}

const pairs: readonly PairSpec[] = [
  { key: "pushPull", left: "push", right: "pull", ideal: 1, tolerance: 1.5 },
  { key: "quadsHamstrings", left: ["quads"], right: ["hamstrings"], ideal: 1, tolerance: 1.5 },
  { key: "frontRearDelts", left: ["shoulders"], right: ["rearDelts"], ideal: 1, tolerance: 2 },
  { key: "bicepsTriceps", left: ["biceps"], right: ["triceps"], ideal: 1, tolerance: 1.75 },
  { key: "absLowerBack", left: ["abs"], right: ["lowerBack"], ideal: 1, tolerance: 2.5 },
  // Six upper vs four lower muscle groups, so 1.5 : 1 sets is even.
  {
    key: "upperLower",
    left: ["chest", "lats", "upperBack", "shoulders", "biceps", "triceps"],
    right: ["quads", "hamstrings", "glutes", "calves"],
    ideal: 1.5,
    tolerance: 1.75,
  },
];

/** Below this many sets on both sides together there's too little data to judge. */
const minSets = 6;

export interface BalanceCheck {
  readonly key: BalanceKey;
  readonly left: number;
  readonly right: number;
  readonly ideal: number;
  /** How many times further apart than ideal; 1 = perfect. */
  readonly factor: number;
  /** The side that needs more work, if the pair is off. */
  readonly weaker: "left" | "right" | null;
}

export const balanceChecks = (data: Data, days = 14, to: string = today()): BalanceCheck[] => {
  const from = addDays(to, -(days - 1));
  const perMuscle = setsPerMuscle(data, from, to);
  const patterns = { push: 0, pull: 0 };
  for (const w of data.workouts) {
    if (w.date < from || w.date > to) continue;
    for (const e of w.exercises) {
      const p = getExercise(data, e.exerciseKey).pattern;
      if (p === "push" || p === "pull") patterns[p] += e.sets.filter(hasValue).length;
    }
  }
  const sum = (side: readonly Muscle[] | "push" | "pull") =>
    typeof side === "string" ? patterns[side] : side.reduce((s, m) => s + (perMuscle.get(m) ?? 0), 0);

  return pairs.flatMap((pair) => {
    const left = sum(pair.left);
    const right = sum(pair.right);
    if (left + right < minSets) return [];
    // +1 keeps a side with zero sets from becoming an infinite factor.
    const ratio = (left + 1) / pair.ideal / (right + 1);
    const factor = Math.max(ratio, 1 / ratio);
    const weaker = factor > pair.tolerance ? (ratio > 1 ? "right" : "left") : null;
    return [{ key: pair.key, left, right, ideal: pair.ideal, factor, weaker }];
  });
};

/** Whether an exercise mainly trains the given side of a pair. */
export const trainsSide = (key: BalanceKey, side: "left" | "right"): ((e: Exercise) => boolean) => {
  const pair = pairs.find((x) => x.key === key)!;
  const target = side === "left" ? pair.left : pair.right;
  return typeof target === "string" ? (e) => e.pattern === target : (e) => e.primary.some((m) => target.includes(m));
};

/** Only the pairs that are off, worst first. */
export const imbalances = (checks: readonly BalanceCheck[]): BalanceCheck[] =>
  checks.filter((c) => c.weaker !== null).sort((a, b) => b.factor - a.factor);
