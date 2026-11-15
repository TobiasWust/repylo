/**
 * Finer movement classes than `Exercise.pattern`, for spotting exercises that
 * do almost the same thing, and which exercises load a muscle in a
 * lengthened (stretched) position.
 *
 * Custom exercises have no class; the rules that need one skip them.
 */
import type { Muscle } from "./exercises";

export type Movement =
  | "flatPress"
  | "inclinePress"
  | "fly"
  | "dip"
  | "verticalPress"
  | "lateralRaise"
  | "frontRaise"
  | "uprightRow"
  | "rearDelt"
  | "verticalPull"
  | "row"
  | "pullover"
  | "shrug"
  | "curl"
  | "inclineCurl"
  | "preacherCurl"
  | "hammerCurl"
  | "forearm"
  | "tricepsPress"
  | "tricepsPushdown"
  | "tricepsOverhead"
  | "lyingExtension"
  | "squat"
  | "lunge"
  | "kneeExtension"
  | "hinge"
  | "kneeFlexion"
  | "hipThrust"
  | "kickback"
  | "abduction"
  | "adduction"
  | "calfRaise"
  | "seatedCalfRaise"
  | "backExtension"
  | "crunch"
  | "legRaise"
  | "stability"
  | "rotation"
  | "carry";

const classes: Record<Movement, readonly string[]> = {
  flatPress: [
    "bench_press",
    "db_bench_press",
    "machine_chest_press",
    "push_up",
    "smith_bench_press",
    "egym_chest_press",
    "decline_bench_press",
  ],
  inclinePress: ["incline_bench_press", "incline_db_press", "incline_machine_press"],
  fly: ["pec_deck", "cable_fly", "db_fly", "egym_butterfly"],
  dip: ["dips", "machine_dips"],
  verticalPress: [
    "overhead_press",
    "db_shoulder_press",
    "machine_shoulder_press",
    "arnold_press",
    "kb_press",
    "pike_push_up",
    "egym_shoulder_press",
  ],
  lateralRaise: ["lateral_raise", "cable_lateral_raise", "machine_lateral_raise"],
  frontRaise: ["front_raise"],
  uprightRow: ["upright_row"],
  rearDelt: ["face_pull", "reverse_fly", "rear_delt_raise", "egym_reverse_butterfly"],
  verticalPull: ["pull_up", "chin_up", "lat_pulldown", "assisted_pull_up", "egym_lat_pulldown"],
  row: [
    "barbell_row",
    "db_row",
    "cable_row",
    "machine_row",
    "t_bar_row",
    "inverted_row",
    "chest_supported_row",
    "kb_row",
    "egym_seated_row",
  ],
  pullover: ["straight_arm_pulldown", "db_pullover"],
  shrug: ["shrug"],
  curl: ["barbell_curl", "db_curl", "cable_curl", "ez_curl", "egym_biceps"],
  inclineCurl: ["incline_db_curl"],
  preacherCurl: ["preacher_curl", "concentration_curl"],
  hammerCurl: ["hammer_curl"],
  forearm: ["reverse_curl", "wrist_curl", "dead_hang"],
  tricepsPress: ["close_grip_bench", "bench_dips"],
  tricepsPushdown: ["triceps_pushdown", "triceps_kickback", "egym_triceps"],
  tricepsOverhead: ["overhead_triceps", "db_overhead_extension"],
  lyingExtension: ["skull_crusher"],
  squat: [
    "squat",
    "front_squat",
    "hack_squat",
    "goblet_squat",
    "smith_squat",
    "bw_squat",
    "kb_goblet_squat",
    "egym_squat",
    "thruster",
    "wall_sit",
    "leg_press",
    "egym_leg_press",
  ],
  lunge: ["lunge", "bulgarian_split_squat", "step_up", "walking_lunge", "bw_lunge", "bw_split_squat"],
  kneeExtension: ["leg_extension", "egym_leg_extension"],
  hinge: ["deadlift", "rdl", "sumo_deadlift", "trap_bar_deadlift", "good_morning", "kb_swing", "power_clean"],
  kneeFlexion: ["leg_curl_lying", "leg_curl_seated", "nordic_curl", "egym_leg_curl"],
  hipThrust: ["hip_thrust", "glute_bridge", "single_leg_glute_bridge", "egym_hip_thrust"],
  kickback: ["cable_kickback", "egym_glute"],
  abduction: ["hip_abduction", "egym_abductor"],
  adduction: ["hip_adduction", "egym_adductor", "copenhagen_plank"],
  calfRaise: ["calf_raise_standing", "leg_press_calf_raise", "calf_raise_bodyweight", "calf_raise_single_leg"],
  seatedCalfRaise: ["calf_raise_seated"],
  backExtension: ["back_extension", "superman", "bird_dog", "egym_back_extension"],
  crunch: ["crunch", "cable_crunch", "sit_up", "ab_machine", "egym_abdominal"],
  legRaise: ["hanging_leg_raise", "lying_leg_raise"],
  stability: ["plank", "ab_wheel", "dead_bug", "mountain_climber", "side_plank", "pallof_press"],
  rotation: ["russian_twist", "woodchopper", "egym_rotation"],
  carry: ["farmers_walk", "turkish_get_up"],
};

const byExercise = new Map<string, Movement>(
  Object.entries(classes).flatMap(([movement, keys]) => keys.map((k) => [k, movement as Movement] as const)),
);

export const movementOf = (exerciseKey: string): Movement | null => byExercise.get(exerciseKey) ?? null;

/** Multi-joint movements; two of them for the same muscle in one workout is normal. */
export const compoundMovements: ReadonlySet<Movement> = new Set([
  "flatPress",
  "inclinePress",
  "dip",
  "verticalPress",
  "verticalPull",
  "row",
  "tricepsPress",
  "squat",
  "lunge",
  "hinge",
  "hipThrust",
]);

/** Core, carries and grip work: variety there is normal, never flagged as "too similar". */
export const variedMovements: ReadonlySet<Movement> = new Set(["stability", "rotation", "carry", "forearm", "backExtension"]);

/**
 * Exercises that load a muscle at long lengths, where training studies found
 * clearly more growth than with the short-length version:
 * - triceps: overhead extensions vs pushdowns (Maeo et al. 2023)
 * - hamstrings: seated vs lying leg curls (Maeo et al. 2021); RDLs and good
 *   mornings stretch them over the hip as well
 * - calves: straight-knee vs seated calf raises (Kinoshita et al. 2023)
 */
export const lengthened: Partial<Record<Muscle, ReadonlySet<string>>> = {
  triceps: new Set(classes.tricepsOverhead),
  hamstrings: new Set(["leg_curl_seated", "rdl", "good_morning"]),
  calves: new Set(classes.calfRaise),
};
