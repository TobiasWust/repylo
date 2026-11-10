/**
 * Training plan assistant: builds split templates from days per week,
 * training place and goal. Plans are made of movement "slots" (squat,
 * horizontal push, …); each place maps a slot to two exercise options, so
 * A and B days get variety without extra rules.
 */
import { getExercise, type Data, type Goal, type Language, type TemplateItem } from "./model";

export type Place = "gym" | "egym" | "home";

type Slot =
  | "squat"
  | "hinge"
  | "hpush"
  | "vpush"
  | "hpull"
  | "vpull"
  | "quads"
  | "hams"
  | "glutes"
  | "calves"
  | "chestIso"
  | "shoulderIso"
  | "rearDelts"
  | "biceps"
  | "triceps"
  | "core";

/** [A option, B option]; a missing slot is simply skipped (e.g. calves on EGYM). */
const options: Record<Place, Partial<Record<Slot, readonly [string, string]>>> = {
  gym: {
    squat: ["squat", "leg_press"],
    hinge: ["rdl", "deadlift"],
    hpush: ["bench_press", "db_bench_press"],
    vpush: ["overhead_press", "db_shoulder_press"],
    hpull: ["cable_row", "barbell_row"],
    vpull: ["lat_pulldown", "pull_up"],
    quads: ["leg_extension", "bulgarian_split_squat"],
    hams: ["leg_curl_seated", "leg_curl_lying"],
    glutes: ["hip_thrust", "cable_kickback"],
    calves: ["calf_raise_standing", "calf_raise_seated"],
    chestIso: ["pec_deck", "cable_fly"],
    shoulderIso: ["lateral_raise", "cable_lateral_raise"],
    rearDelts: ["face_pull", "reverse_fly"],
    biceps: ["db_curl", "hammer_curl"],
    triceps: ["triceps_pushdown", "overhead_triceps"],
    core: ["cable_crunch", "hanging_leg_raise"],
  },
  egym: {
    squat: ["egym_leg_press", "egym_squat"],
    hinge: ["egym_back_extension", "egym_glute"],
    hpush: ["egym_chest_press", "egym_chest_press"],
    vpush: ["egym_shoulder_press", "egym_shoulder_press"],
    hpull: ["egym_seated_row", "egym_seated_row"],
    vpull: ["egym_lat_pulldown", "egym_lat_pulldown"],
    quads: ["egym_leg_extension", "egym_adductor"],
    hams: ["egym_leg_curl", "egym_leg_curl"],
    glutes: ["egym_hip_thrust", "egym_abductor"],
    chestIso: ["egym_butterfly", "egym_butterfly"],
    rearDelts: ["egym_reverse_butterfly", "egym_reverse_butterfly"],
    biceps: ["egym_biceps", "egym_biceps"],
    triceps: ["egym_triceps", "egym_triceps"],
    core: ["egym_abdominal", "egym_rotation"],
  },
  home: {
    squat: ["goblet_squat", "bulgarian_split_squat"],
    hinge: ["kb_swing", "glute_bridge"],
    hpush: ["push_up", "db_bench_press"],
    vpush: ["db_shoulder_press", "arnold_press"],
    hpull: ["db_row", "inverted_row"],
    vpull: ["pull_up", "db_pullover"],
    quads: ["lunge", "step_up"],
    hams: ["nordic_curl", "glute_bridge"],
    glutes: ["glute_bridge", "step_up"],
    chestIso: ["db_fly", "db_fly"],
    shoulderIso: ["lateral_raise", "lateral_raise"],
    rearDelts: ["rear_delt_raise", "rear_delt_raise"],
    biceps: ["db_curl", "hammer_curl"],
    triceps: ["db_overhead_extension", "triceps_kickback"],
    core: ["plank", "dead_bug"],
  },
};

type DayKind = "full" | "upper" | "lower" | "push" | "pull" | "legs";

const daySlots: Record<DayKind, readonly Slot[]> = {
  full: ["squat", "hpush", "vpull", "hinge", "vpush", "hpull", "core"],
  upper: ["hpush", "vpull", "vpush", "hpull", "chestIso", "biceps", "triceps"],
  lower: ["squat", "hinge", "quads", "hams", "glutes", "calves", "core"],
  push: ["hpush", "vpush", "chestIso", "shoulderIso", "triceps"],
  pull: ["vpull", "hpull", "rearDelts", "biceps", "core"],
  legs: ["squat", "hinge", "quads", "hams", "glutes", "calves"],
};

const dayNames: Record<DayKind, [string, string]> = {
  full: ["Ganzkörper", "Full body"],
  upper: ["Oberkörper", "Upper body"],
  lower: ["Unterkörper", "Lower body"],
  push: ["Push", "Push"],
  pull: ["Pull", "Pull"],
  legs: ["Beine", "Legs"],
};

/** Proven splits for each number of training days. Variant 0 = A, 1 = B. */
const splits: Record<number, readonly [DayKind, 0 | 1, string][]> = {
  2: [["full", 0, "A"], ["full", 1, "B"]],
  3: [["full", 0, "A"], ["full", 1, "B"], ["full", 0, "C"]],
  4: [["upper", 0, "A"], ["lower", 0, "A"], ["upper", 1, "B"], ["lower", 1, "B"]],
  5: [["push", 0, ""], ["pull", 0, ""], ["legs", 0, ""], ["upper", 1, ""], ["lower", 1, ""]],
  6: [["push", 0, "A"], ["pull", 0, "A"], ["legs", 0, "A"], ["push", 1, "B"], ["pull", 1, "B"], ["legs", 1, "B"]],
};

const startReps: Record<Goal, number> = { strength: 5, hypertrophy: 10, endurance: 15 };

export interface PlannedTemplate {
  readonly name: string;
  readonly items: readonly TemplateItem[];
}

export const generatePlan = (data: Data, days: number, place: Place, goal: Goal, lang: Language): PlannedTemplate[] => {
  const split = splits[Math.min(6, Math.max(2, days))]!;
  // Start in the middle of the goal's rep range; EGYM's standard program is 3 × 20.
  const reps = place === "egym" && goal === "endurance" ? 20 : startReps[goal];
  return split.map(([kind, variant, suffix], index) => {
    const keys: string[] = [];
    // Day C of the 3-day plan swaps the order of A's slots for variety.
    let slots: readonly Slot[] = suffix === "C" ? [...daySlots[kind]].reverse() : daySlots[kind];
    // B upper days swap the chest isolation for rear delts: variety even where
    // a place has one machine per movement (EGYM), and more pulling overall.
    if (kind === "upper" && variant === 1) slots = slots.map((s) => (s === "chestIso" ? "rearDelts" : s));
    for (const slot of slots) {
      const choice = options[place][slot];
      const key = choice?.[index === 2 && suffix === "C" ? 1 : variant];
      if (key && !keys.includes(key) && data.exercises.has(key)) keys.push(key);
    }
    return {
      name: `${dayNames[kind][lang === "de" ? 0 : 1]}${suffix ? ` ${suffix}` : ""}`,
      items: keys.map((exerciseKey) => {
        const timed = getExercise(data, exerciseKey).metric === "time";
        return {
          exerciseKey,
          sets: Array.from({ length: 3 }, () => ({ weight: null, reps: timed ? null : reps, duration: timed ? 30 : null, distance: null })),
        };
      }),
    };
  });
};
