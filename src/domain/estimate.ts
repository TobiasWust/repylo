/**
 * Starting weights for exercises the user has never done.
 *
 * 1. Every exercise has a baseline est. 1RM for an average recreational
 *    lifter (≈ 75 kg, a few months of training): explicit values for common
 *    lifts, otherwise a rule by equipment and muscle size.
 * 2. The user's strength factor = their best recent est. 1RM ÷ baseline,
 *    averaged over exercises they did, weighted by similarity to the new
 *    exercise (same muscle, equipment, movement).
 * 3. New est. 1RM = baseline × factor → working weight for the goal's reps,
 *    with a 10 % safety margin, rounded to the equipment's steps.
 *
 * It's a starting point, clearly labelled as an estimate in the UI.
 */
import { addDays, today } from "./dates";
import { incrementKg, incrementLb, minorMuscles, type Exercise, type Muscle } from "./exercises";
import { getExercise, goalFor, type Data, type Goal, type TemplateSet } from "./model";
import { bodyWeightAt, exerciseSessions } from "./stats";
import { fromUnit, toUnit } from "./units";

/** Average recreational lifter's est. 1RM in kg (dumbbells: per hand). */
const baselineKg: Record<string, number> = {
  squat: 85,
  front_squat: 65,
  deadlift: 105,
  sumo_deadlift: 100,
  trap_bar_deadlift: 110,
  rdl: 80,
  good_morning: 45,
  bench_press: 65,
  incline_bench_press: 55,
  decline_bench_press: 70,
  close_grip_bench: 55,
  smith_bench_press: 60,
  overhead_press: 42,
  barbell_row: 60,
  t_bar_row: 55,
  power_clean: 55,
  thruster: 45,
  upright_row: 35,
  barbell_curl: 32,
  ez_curl: 32,
  reverse_curl: 22,
  skull_crusher: 30,
  hip_thrust: 95,
  leg_press: 150,
  hack_squat: 100,
  smith_squat: 80,
  leg_extension: 55,
  leg_curl_seated: 45,
  leg_curl_lying: 40,
  calf_raise_standing: 80,
  calf_raise_seated: 50,
  leg_press_calf_raise: 110,
  hip_abduction: 60,
  hip_adduction: 60,
  lat_pulldown: 60,
  cable_row: 60,
  machine_row: 60,
  assisted_pull_up: 30,
  machine_chest_press: 65,
  incline_machine_press: 55,
  machine_shoulder_press: 45,
  pec_deck: 50,
  reverse_fly: 35,
  machine_lateral_raise: 30,
  preacher_curl: 30,
  machine_dips: 60,
  ab_machine: 45,
  triceps_pushdown: 30,
  overhead_triceps: 25,
  cable_curl: 25,
  face_pull: 25,
  cable_fly: 20,
  cable_lateral_raise: 8,
  cable_crunch: 45,
  straight_arm_pulldown: 25,
  woodchopper: 20,
  pallof_press: 15,
  cable_kickback: 20,
  db_bench_press: 26,
  incline_db_press: 22,
  db_shoulder_press: 20,
  arnold_press: 16,
  db_row: 30,
  chest_supported_row: 22,
  db_curl: 13,
  hammer_curl: 15,
  incline_db_curl: 10,
  concentration_curl: 12,
  lateral_raise: 9,
  front_raise: 9,
  rear_delt_raise: 8,
  db_fly: 14,
  db_pullover: 22,
  triceps_kickback: 9,
  db_overhead_extension: 20,
  wrist_curl: 14,
  shrug: 32,
  goblet_squat: 30,
  lunge: 18,
  walking_lunge: 18,
  step_up: 16,
  bulgarian_split_squat: 16,
  farmers_walk: 30,
  kb_swing: 24,
  kb_goblet_squat: 24,
  kb_press: 16,
  kb_row: 24,
  turkish_get_up: 12,
};

const isLarge = (muscles: readonly Muscle[]) =>
  muscles.some((m) => !minorMuscles.has(m) && !["biceps", "triceps", "shoulders", "abs", "calves"].includes(m));

/** Rule of thumb when there is no explicit baseline. */
const ruleBaseline = (e: Exercise): number => {
  const large = isLarge(e.primary);
  const table: Record<Exercise["equipment"], [number, number]> = {
    barbell: [70, 32],
    dumbbell: [24, 11],
    kettlebell: [20, 12],
    machine: [70, 35],
    egym: [40, 25],
    cable: [55, 22],
    bodyweight: [0, 0],
    cardio: [0, 0],
    other: [40, 20],
  };
  return table[e.equipment][large ? 0 : 1];
};

const baselineE1rm = (e: Exercise): number => baselineKg[e.key] ?? ruleBaseline(e);

/** How alike two exercises are, as a weight for averaging strength factors. */
const similarity = (a: Exercise, b: Exercise): number => {
  // The trained muscle matters most; equipment and movement only refine it.
  let score = 0.5;
  if (a.primary.some((m) => b.primary.includes(m))) score += 4;
  else if (a.primary.some((m) => b.secondary.includes(m)) || b.primary.some((m) => a.secondary.includes(m))) score += 1;
  if (a.equipment === b.equipment) score += 1;
  if (a.pattern === b.pattern) score += 1;
  return score;
};

export interface Estimate {
  readonly sets: readonly TemplateSet[];
  /** Exercises the estimate is mainly based on (most similar first); empty = population average. */
  readonly basedOn: readonly string[];
}

const startReps: Record<Goal, number> = { strength: 5, hypertrophy: 10, endurance: 15 };

export const estimateStart = (data: Data, exerciseKey: string): Estimate | null => {
  const target = getExercise(data, exerciseKey);
  const goal = goalFor(data, exerciseKey);
  const reps = target.equipment === "egym" && goal === "endurance" ? 20 : startReps[goal];
  const three = (set: TemplateSet) => [set, set, set];

  if (target.metric === "cardio") return null;
  if (target.metric === "time") return { sets: three({ weight: null, reps: null, duration: 30, distance: null }), basedOn: [] };
  if (target.metric === "bodyweight")
    return { sets: three({ weight: null, reps: Math.min(reps, 10), duration: null, distance: null }), basedOn: [] };

  const baseline = baselineE1rm(target);
  if (baseline <= 0) return null;

  // Personal strength factor from recent history: the five most similar
  // exercises, with similarity squared so close matches dominate (a heavy
  // lateral raise says little about an incline press).
  const since = addDays(today(), -120);
  const candidates: { key: string; similarity: number; ratio: number }[] = [];
  const keys = new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.exerciseKey)));
  for (const key of keys) {
    if (key === exerciseKey) continue;
    const other = getExercise(data, key);
    const otherBaseline = baselineE1rm(other);
    if (other.metric !== "weight" || otherBaseline <= 0) continue;
    const best = Math.max(
      0,
      ...exerciseSessions(data, key)
        .filter((s) => s.date >= since)
        .map((s) => s.bestE1rm),
    );
    if (best > 0) candidates.push({ key, similarity: similarity(target, other), ratio: best / otherBaseline });
  }
  const sources = candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  let weighted = 0,
    total = 0;
  for (const c of sources) {
    weighted += c.ratio * c.similarity ** 2;
    total += c.similarity ** 2;
  }

  let factor: number;
  if (total > 0) {
    factor = weighted / total;
  } else {
    // No history: average lifter scaled by body weight and standards, a bit
    // lighter because the user may be new to training.
    const bodyWeight = bodyWeightAt(data, today());
    factor = (bodyWeight ? bodyWeight / 75 : 1) * (data.settings.standards === "female" ? 0.6 : 1) * 0.8;
  }
  factor = Math.min(2.5, Math.max(0.3, factor));

  const unit = data.settings.unit;
  const step = (unit === "kg" ? incrementKg : incrementLb)[target.equipment] || (unit === "kg" ? 2.5 : 5);
  // Working weight for the target reps (inverse Epley) with a 10 % safety margin.
  const kg = ((baseline * factor) / (1 + Math.min(reps, 12) / 30)) * 0.9;
  const weight = fromUnit(Math.max(step, Math.round(toUnit(kg, unit) / step) * step), unit);
  return {
    sets: three({ weight, reps, duration: null, distance: null }),
    basedOn: sources.slice(0, 2).map((s) => s.key),
  };
};
