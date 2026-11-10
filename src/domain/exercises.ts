/**
 * Built-in exercise library and muscle model.
 *
 * Built-in exercises live in code (not in the database) so they can be
 * translated and improved with app updates. Logged sets reference an exercise
 * by key: a built-in key like "bench_press" or the id of a custom exercise.
 */

export const muscles = [
  "chest",
  "lats",
  "upperBack",
  "lowerBack",
  "shoulders",
  "rearDelts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  "calves",
] as const;
export type Muscle = (typeof muscles)[number];

/** Small muscles get plenty of indirect work; we don't nag about them. */
export const minorMuscles: ReadonlySet<Muscle> = new Set(["forearms", "lowerBack", "rearDelts", "adductors"]);

export type Equipment = "barbell" | "dumbbell" | "kettlebell" | "machine" | "egym" | "cable" | "bodyweight" | "cardio" | "other";

/**
 * How a set is measured.
 * - weight: weight × reps
 * - bodyweight: reps, optionally with added weight
 * - time: duration only (plank)
 * - cardio: duration, optionally distance
 */
export type Metric = "weight" | "bodyweight" | "time" | "cardio";

export type Pattern = "push" | "pull" | "legs" | "core" | "cardio";

export interface Exercise {
  readonly key: string;
  readonly name: { readonly de: string; readonly en: string };
  readonly equipment: Equipment;
  readonly metric: Metric;
  readonly pattern: Pattern;
  readonly primary: readonly Muscle[];
  readonly secondary: readonly Muscle[];
  /** Alternatives that train the same thing; used for plateau suggestions. */
  readonly variants: readonly string[];
  readonly custom: boolean;
}

type Def = [
  key: string,
  de: string,
  en: string,
  equipment: Equipment,
  metric: Metric,
  pattern: Pattern,
  primary: Muscle[],
  secondary: Muscle[],
  variants?: string[],
];

// Compact table form keeps ~60 exercises readable at a glance.
const defs: Def[] = [
  // Chest
  ["bench_press", "Bankdrücken (Langhantel)", "Barbell Bench Press", "barbell", "weight", "push", ["chest"], ["triceps", "shoulders"], ["db_bench_press", "incline_bench_press", "machine_chest_press"]],
  ["incline_bench_press", "Schrägbankdrücken (Langhantel)", "Incline Bench Press", "barbell", "weight", "push", ["chest"], ["shoulders", "triceps"], ["incline_db_press", "bench_press"]],
  ["db_bench_press", "Bankdrücken (Kurzhantel)", "Dumbbell Bench Press", "dumbbell", "weight", "push", ["chest"], ["triceps", "shoulders"], ["bench_press", "machine_chest_press"]],
  ["incline_db_press", "Schrägbankdrücken (Kurzhantel)", "Incline Dumbbell Press", "dumbbell", "weight", "push", ["chest"], ["shoulders", "triceps"], ["incline_bench_press", "machine_chest_press"]],
  ["machine_chest_press", "Brustpresse (Maschine)", "Machine Chest Press", "machine", "weight", "push", ["chest"], ["triceps", "shoulders"], ["db_bench_press", "dips"]],
  ["pec_deck", "Butterfly (Maschine)", "Pec Deck", "machine", "weight", "push", ["chest"], [], ["cable_fly"]],
  ["cable_fly", "Cable Flys", "Cable Fly", "cable", "weight", "push", ["chest"], ["shoulders"], ["pec_deck"]],
  ["dips", "Dips", "Dips", "bodyweight", "bodyweight", "push", ["chest", "triceps"], ["shoulders"], ["close_grip_bench", "machine_chest_press"]],
  ["push_up", "Liegestütze", "Push-Up", "bodyweight", "bodyweight", "push", ["chest"], ["triceps", "shoulders"], ["db_bench_press"]],
  // Back
  ["deadlift", "Kreuzheben", "Deadlift", "barbell", "weight", "legs", ["hamstrings", "glutes", "lowerBack"], ["upperBack", "quads", "forearms"], ["rdl", "hip_thrust"]],
  ["pull_up", "Klimmzüge", "Pull-Up", "bodyweight", "bodyweight", "pull", ["lats"], ["biceps", "upperBack"], ["lat_pulldown", "chin_up"]],
  ["chin_up", "Klimmzüge (Untergriff)", "Chin-Up", "bodyweight", "bodyweight", "pull", ["lats", "biceps"], ["upperBack"], ["pull_up", "lat_pulldown"]],
  ["lat_pulldown", "Latzug", "Lat Pulldown", "cable", "weight", "pull", ["lats"], ["biceps", "upperBack"], ["pull_up", "machine_row"]],
  ["barbell_row", "Langhantelrudern", "Barbell Row", "barbell", "weight", "pull", ["upperBack", "lats"], ["biceps", "rearDelts", "lowerBack"], ["db_row", "t_bar_row", "cable_row"]],
  ["db_row", "Kurzhantelrudern einarmig", "One-Arm Dumbbell Row", "dumbbell", "weight", "pull", ["lats", "upperBack"], ["biceps", "rearDelts"], ["cable_row", "barbell_row"]],
  ["cable_row", "Rudern am Kabel (sitzend)", "Seated Cable Row", "cable", "weight", "pull", ["upperBack", "lats"], ["biceps", "rearDelts"], ["machine_row", "db_row"]],
  ["machine_row", "Rudermaschine", "Machine Row", "machine", "weight", "pull", ["upperBack", "lats"], ["biceps", "rearDelts"], ["cable_row", "t_bar_row"]],
  ["t_bar_row", "T-Bar-Rudern", "T-Bar Row", "barbell", "weight", "pull", ["upperBack", "lats"], ["biceps", "lowerBack"], ["barbell_row", "machine_row"]],
  ["face_pull", "Face Pulls", "Face Pull", "cable", "weight", "pull", ["rearDelts"], ["upperBack"], ["reverse_fly"]],
  ["reverse_fly", "Reverse Butterfly (Maschine)", "Reverse Pec Deck", "machine", "weight", "pull", ["rearDelts"], ["upperBack"], ["face_pull"]],
  ["shrug", "Shrugs (Kurzhantel)", "Dumbbell Shrug", "dumbbell", "weight", "pull", ["upperBack"], ["forearms"], []],
  ["back_extension", "Rückenstrecker (Hyperextension)", "Back Extension", "bodyweight", "bodyweight", "core", ["lowerBack"], ["glutes", "hamstrings"], []],
  // Shoulders
  ["overhead_press", "Schulterdrücken (Langhantel)", "Overhead Press", "barbell", "weight", "push", ["shoulders"], ["triceps"], ["db_shoulder_press", "machine_shoulder_press"]],
  ["db_shoulder_press", "Schulterdrücken (Kurzhantel)", "Dumbbell Shoulder Press", "dumbbell", "weight", "push", ["shoulders"], ["triceps"], ["overhead_press", "machine_shoulder_press"]],
  ["machine_shoulder_press", "Schulterpresse (Maschine)", "Machine Shoulder Press", "machine", "weight", "push", ["shoulders"], ["triceps"], ["db_shoulder_press"]],
  ["lateral_raise", "Seitheben (Kurzhantel)", "Lateral Raise", "dumbbell", "weight", "push", ["shoulders"], [], ["cable_lateral_raise"]],
  ["cable_lateral_raise", "Seitheben am Kabel", "Cable Lateral Raise", "cable", "weight", "push", ["shoulders"], [], ["lateral_raise"]],
  // Arms
  ["barbell_curl", "Langhantel-Curls", "Barbell Curl", "barbell", "weight", "pull", ["biceps"], ["forearms"], ["db_curl", "preacher_curl"]],
  ["db_curl", "Kurzhantel-Curls", "Dumbbell Curl", "dumbbell", "weight", "pull", ["biceps"], ["forearms"], ["hammer_curl", "cable_curl"]],
  ["hammer_curl", "Hammercurls", "Hammer Curl", "dumbbell", "weight", "pull", ["biceps"], ["forearms"], ["db_curl"]],
  ["cable_curl", "Bizeps-Curls am Kabel", "Cable Curl", "cable", "weight", "pull", ["biceps"], ["forearms"], ["db_curl", "preacher_curl"]],
  ["preacher_curl", "Scott-Curls (Maschine)", "Preacher Curl", "machine", "weight", "pull", ["biceps"], [], ["barbell_curl", "cable_curl"]],
  ["triceps_pushdown", "Trizepsdrücken am Kabel", "Triceps Pushdown", "cable", "weight", "push", ["triceps"], [], ["overhead_triceps", "skull_crusher"]],
  ["overhead_triceps", "Trizeps über Kopf (Kabel)", "Overhead Triceps Extension", "cable", "weight", "push", ["triceps"], [], ["triceps_pushdown", "skull_crusher"]],
  ["skull_crusher", "French Press (SZ-Stange)", "Skull Crusher", "barbell", "weight", "push", ["triceps"], [], ["overhead_triceps", "close_grip_bench"]],
  ["close_grip_bench", "Enges Bankdrücken", "Close-Grip Bench Press", "barbell", "weight", "push", ["triceps"], ["chest", "shoulders"], ["dips", "skull_crusher"]],
  // Legs
  ["squat", "Kniebeuge (Langhantel)", "Back Squat", "barbell", "weight", "legs", ["quads", "glutes"], ["hamstrings", "lowerBack"], ["front_squat", "hack_squat", "leg_press"]],
  ["front_squat", "Frontkniebeuge", "Front Squat", "barbell", "weight", "legs", ["quads"], ["glutes", "upperBack"], ["squat", "hack_squat"]],
  ["leg_press", "Beinpresse", "Leg Press", "machine", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["hack_squat", "squat", "bulgarian_split_squat"]],
  ["hack_squat", "Hackenschmidt-Kniebeuge", "Hack Squat", "machine", "weight", "legs", ["quads"], ["glutes"], ["leg_press", "front_squat"]],
  ["leg_extension", "Beinstrecker", "Leg Extension", "machine", "weight", "legs", ["quads"], [], ["bulgarian_split_squat"]],
  ["lunge", "Ausfallschritte (Kurzhantel)", "Dumbbell Lunge", "dumbbell", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["bulgarian_split_squat"]],
  ["bulgarian_split_squat", "Bulgarian Split Squats", "Bulgarian Split Squat", "dumbbell", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["lunge", "leg_press"]],
  ["rdl", "Rumänisches Kreuzheben", "Romanian Deadlift", "barbell", "weight", "legs", ["hamstrings", "glutes"], ["lowerBack"], ["leg_curl_lying", "deadlift", "hip_thrust"]],
  ["leg_curl_lying", "Beinbeuger liegend", "Lying Leg Curl", "machine", "weight", "legs", ["hamstrings"], ["calves"], ["leg_curl_seated", "rdl"]],
  ["leg_curl_seated", "Beinbeuger sitzend", "Seated Leg Curl", "machine", "weight", "legs", ["hamstrings"], [], ["leg_curl_lying", "rdl"]],
  ["hip_thrust", "Hip Thrust", "Hip Thrust", "barbell", "weight", "legs", ["glutes"], ["hamstrings"], ["rdl", "hip_abduction"]],
  ["hip_abduction", "Abduktoren-Maschine", "Hip Abduction", "machine", "weight", "legs", ["glutes"], [], ["hip_thrust"]],
  ["calf_raise_standing", "Wadenheben stehend", "Standing Calf Raise", "machine", "weight", "legs", ["calves"], [], ["calf_raise_seated"]],
  ["calf_raise_seated", "Wadenheben sitzend", "Seated Calf Raise", "machine", "weight", "legs", ["calves"], [], ["calf_raise_standing"]],
  // More free weight, machine and bodyweight staples
  ["decline_bench_press", "Negativbankdrücken (Langhantel)", "Decline Bench Press", "barbell", "weight", "push", ["chest"], ["triceps"], ["bench_press", "dips"]],
  ["smith_bench_press", "Bankdrücken an der Multipresse", "Smith Machine Bench Press", "machine", "weight", "push", ["chest"], ["triceps", "shoulders"], ["bench_press", "machine_chest_press"]],
  ["db_fly", "Kurzhantel-Flys", "Dumbbell Fly", "dumbbell", "weight", "push", ["chest"], ["shoulders"], ["cable_fly", "pec_deck"]],
  ["incline_machine_press", "Schrägbankdrücken (Maschine)", "Incline Machine Press", "machine", "weight", "push", ["chest"], ["shoulders", "triceps"], ["incline_db_press"]],
  ["sumo_deadlift", "Sumo-Kreuzheben", "Sumo Deadlift", "barbell", "weight", "legs", ["glutes", "quads", "adductors"], ["hamstrings", "lowerBack", "upperBack"], ["deadlift", "trap_bar_deadlift"]],
  ["trap_bar_deadlift", "Kreuzheben mit Trap Bar", "Trap Bar Deadlift", "barbell", "weight", "legs", ["quads", "glutes", "hamstrings"], ["upperBack", "lowerBack"], ["deadlift", "squat"]],
  ["good_morning", "Good Mornings", "Good Morning", "barbell", "weight", "legs", ["hamstrings", "lowerBack"], ["glutes"], ["rdl", "back_extension"]],
  ["assisted_pull_up", "Klimmzüge (Maschine, unterstützt)", "Assisted Pull-Up", "machine", "weight", "pull", ["lats"], ["biceps", "upperBack"], ["lat_pulldown", "pull_up"]],
  ["straight_arm_pulldown", "Überzüge am Kabel (gestreckte Arme)", "Straight-Arm Pulldown", "cable", "weight", "pull", ["lats"], ["rearDelts"], ["db_pullover", "lat_pulldown"]],
  ["db_pullover", "Pullover (Kurzhantel)", "Dumbbell Pullover", "dumbbell", "weight", "pull", ["lats", "chest"], ["triceps"], ["straight_arm_pulldown"]],
  ["inverted_row", "Rudern mit Körpergewicht", "Inverted Row", "bodyweight", "bodyweight", "pull", ["upperBack", "lats"], ["biceps", "rearDelts"], ["cable_row", "barbell_row"]],
  ["chest_supported_row", "Rudern auf der Schrägbank (Kurzhantel)", "Chest-Supported Row", "dumbbell", "weight", "pull", ["upperBack", "lats"], ["rearDelts", "biceps"], ["db_row", "machine_row"]],
  ["arnold_press", "Arnold Press", "Arnold Press", "dumbbell", "weight", "push", ["shoulders"], ["triceps"], ["db_shoulder_press"]],
  ["front_raise", "Frontheben (Kurzhantel)", "Front Raise", "dumbbell", "weight", "push", ["shoulders"], [], ["lateral_raise"]],
  ["upright_row", "Aufrechtes Rudern", "Upright Row", "barbell", "weight", "pull", ["shoulders", "upperBack"], ["biceps"], ["lateral_raise", "shrug"]],
  ["rear_delt_raise", "Vorgebeugtes Seitheben (Kurzhantel)", "Bent-Over Rear Delt Raise", "dumbbell", "weight", "pull", ["rearDelts"], ["upperBack"], ["reverse_fly", "face_pull"]],
  ["machine_lateral_raise", "Seitheben (Maschine)", "Machine Lateral Raise", "machine", "weight", "push", ["shoulders"], [], ["lateral_raise", "cable_lateral_raise"]],
  ["ez_curl", "SZ-Curls", "EZ-Bar Curl", "barbell", "weight", "pull", ["biceps"], ["forearms"], ["barbell_curl", "preacher_curl"]],
  ["incline_db_curl", "Schrägbank-Curls (Kurzhantel)", "Incline Dumbbell Curl", "dumbbell", "weight", "pull", ["biceps"], [], ["db_curl"]],
  ["concentration_curl", "Konzentrationscurls", "Concentration Curl", "dumbbell", "weight", "pull", ["biceps"], [], ["db_curl", "preacher_curl"]],
  ["reverse_curl", "Reverse Curls", "Reverse Curl", "barbell", "weight", "pull", ["forearms"], ["biceps"], ["hammer_curl"]],
  ["wrist_curl", "Unterarmcurls", "Wrist Curl", "dumbbell", "weight", "pull", ["forearms"], [], ["reverse_curl"]],
  ["triceps_kickback", "Trizeps-Kickbacks (Kurzhantel)", "Triceps Kickback", "dumbbell", "weight", "push", ["triceps"], [], ["triceps_pushdown"]],
  ["db_overhead_extension", "Trizeps über Kopf (Kurzhantel)", "Dumbbell Overhead Extension", "dumbbell", "weight", "push", ["triceps"], [], ["overhead_triceps", "skull_crusher"]],
  ["bench_dips", "Dips an der Bank", "Bench Dips", "bodyweight", "bodyweight", "push", ["triceps"], ["chest", "shoulders"], ["dips", "triceps_pushdown"]],
  ["machine_dips", "Dip-Maschine", "Machine Dips", "machine", "weight", "push", ["triceps", "chest"], ["shoulders"], ["dips", "close_grip_bench"]],
  ["goblet_squat", "Goblet Squats", "Goblet Squat", "dumbbell", "weight", "legs", ["quads", "glutes"], ["abs"], ["squat", "leg_press"]],
  ["smith_squat", "Kniebeuge an der Multipresse", "Smith Machine Squat", "machine", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["squat", "hack_squat"]],
  ["step_up", "Step-ups (Kurzhantel)", "Step-Up", "dumbbell", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["lunge", "bulgarian_split_squat"]],
  ["walking_lunge", "Ausfallschritte gehend", "Walking Lunge", "dumbbell", "weight", "legs", ["quads", "glutes"], ["hamstrings", "adductors"], ["lunge", "step_up"]],
  ["glute_bridge", "Glute Bridge", "Glute Bridge", "bodyweight", "bodyweight", "legs", ["glutes"], ["hamstrings"], ["hip_thrust"]],
  ["cable_kickback", "Gesäß-Kickbacks am Kabel", "Cable Glute Kickback", "cable", "weight", "legs", ["glutes"], ["hamstrings"], ["hip_thrust", "glute_bridge"]],
  ["hip_adduction", "Adduktoren-Maschine", "Hip Adduction", "machine", "weight", "legs", ["adductors"], [], ["sumo_deadlift"]],
  ["nordic_curl", "Nordic Curls", "Nordic Hamstring Curl", "bodyweight", "bodyweight", "legs", ["hamstrings"], [], ["leg_curl_lying"]],
  ["leg_press_calf_raise", "Wadenheben an der Beinpresse", "Leg Press Calf Raise", "machine", "weight", "legs", ["calves"], [], ["calf_raise_standing", "calf_raise_seated"]],
  // Kettlebell
  ["kb_swing", "Kettlebell Swings", "Kettlebell Swing", "kettlebell", "weight", "legs", ["glutes", "hamstrings"], ["lowerBack", "shoulders"], ["rdl", "hip_thrust"]],
  ["kb_goblet_squat", "Goblet Squats (Kettlebell)", "Kettlebell Goblet Squat", "kettlebell", "weight", "legs", ["quads", "glutes"], ["abs"], ["goblet_squat", "squat"]],
  ["kb_press", "Schulterdrücken (Kettlebell)", "Kettlebell Press", "kettlebell", "weight", "push", ["shoulders"], ["triceps"], ["db_shoulder_press"]],
  ["kb_row", "Rudern (Kettlebell)", "Kettlebell Row", "kettlebell", "weight", "pull", ["lats", "upperBack"], ["biceps"], ["db_row"]],
  ["turkish_get_up", "Turkish Get-up", "Turkish Get-Up", "kettlebell", "weight", "core", ["shoulders", "abs"], ["glutes"], ["kb_press"]],
  ["farmers_walk", "Farmer's Walk", "Farmer's Walk", "dumbbell", "weight", "core", ["forearms", "upperBack"], ["abs"], ["shrug"]],
  // Full body
  ["power_clean", "Umsetzen (Power Clean)", "Power Clean", "barbell", "weight", "legs", ["glutes", "hamstrings", "upperBack"], ["quads", "shoulders"], ["deadlift", "kb_swing"]],
  ["thruster", "Thruster", "Thruster", "barbell", "weight", "legs", ["quads", "shoulders"], ["glutes", "triceps"], ["front_squat", "overhead_press"]],
  ["burpee", "Burpees", "Burpee", "bodyweight", "bodyweight", "cardio", [], ["chest", "quads", "shoulders", "abs"], ["mountain_climber"]],
  // EGYM smart machines (electronic resistance, typically 3 × 20 in circuit)
  ["egym_seated_row", "EGYM Ruderzug", "EGYM Seated Row", "egym", "weight", "pull", ["upperBack", "lats"], ["biceps", "rearDelts"], ["cable_row", "egym_lat_pulldown"]],
  ["egym_abdominal", "EGYM Bauchtrainer", "EGYM Abdominal Crunch", "egym", "weight", "core", ["abs"], [], ["cable_crunch"]],
  ["egym_chest_press", "EGYM Brustpresse", "EGYM Chest Press", "egym", "weight", "push", ["chest"], ["triceps", "shoulders"], ["machine_chest_press", "egym_butterfly"]],
  ["egym_triceps", "EGYM Trizeps", "EGYM Triceps", "egym", "weight", "push", ["triceps"], [], ["triceps_pushdown"]],
  ["egym_lat_pulldown", "EGYM Latzug", "EGYM Lat Pulldown", "egym", "weight", "pull", ["lats"], ["biceps", "upperBack"], ["lat_pulldown", "egym_seated_row"]],
  ["egym_shoulder_press", "EGYM Schulterpresse", "EGYM Shoulder Press", "egym", "weight", "push", ["shoulders"], ["triceps"], ["machine_shoulder_press", "db_shoulder_press"]],
  ["egym_biceps", "EGYM Bizeps", "EGYM Biceps Curl", "egym", "weight", "pull", ["biceps"], ["forearms"], ["preacher_curl", "cable_curl"]],
  ["egym_adductor", "EGYM Adduktor", "EGYM Hip Adductor", "egym", "weight", "legs", ["adductors"], [], ["lunge"]],
  ["egym_abductor", "EGYM Abduktor", "EGYM Hip Abductor", "egym", "weight", "legs", ["glutes"], [], ["hip_abduction", "egym_glute"]],
  ["egym_back_extension", "EGYM Rückentrainer", "EGYM Back Extension", "egym", "weight", "core", ["lowerBack"], ["glutes", "hamstrings"], ["back_extension"]],
  ["egym_leg_curl", "EGYM Beinbeuger", "EGYM Leg Curl", "egym", "weight", "legs", ["hamstrings"], [], ["leg_curl_seated", "rdl"]],
  ["egym_leg_extension", "EGYM Beinstrecker", "EGYM Leg Extension", "egym", "weight", "legs", ["quads"], [], ["leg_extension", "egym_leg_press"]],
  ["egym_leg_press", "EGYM Beinpresse", "EGYM Leg Press", "egym", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["leg_press", "egym_squat"]],
  ["egym_squat", "EGYM Squat", "EGYM Squat", "egym", "weight", "legs", ["quads", "glutes"], ["hamstrings"], ["squat", "egym_leg_press"]],
  ["egym_glute", "EGYM Gluteus", "EGYM Glute", "egym", "weight", "legs", ["glutes"], ["hamstrings"], ["hip_thrust", "egym_abductor"]],
  ["egym_hip_thrust", "EGYM Hip Thrust", "EGYM Hip Thrust", "egym", "weight", "legs", ["glutes"], ["hamstrings"], ["hip_thrust", "egym_glute"]],
  ["egym_butterfly", "EGYM Butterfly", "EGYM Butterfly", "egym", "weight", "push", ["chest"], [], ["pec_deck", "egym_chest_press"]],
  ["egym_reverse_butterfly", "EGYM Butterfly Reverse", "EGYM Reverse Butterfly", "egym", "weight", "pull", ["rearDelts"], ["upperBack"], ["reverse_fly", "face_pull"]],
  ["egym_rotation", "EGYM Rotation", "EGYM Torso Rotation", "egym", "weight", "core", ["abs"], [], ["egym_abdominal"]],
  // Core
  ["plank", "Unterarmstütz (Plank)", "Plank", "bodyweight", "time", "core", ["abs"], [], ["ab_wheel"]],
  ["crunch", "Crunches", "Crunch", "bodyweight", "bodyweight", "core", ["abs"], [], ["cable_crunch"]],
  ["cable_crunch", "Crunches am Kabel", "Cable Crunch", "cable", "weight", "core", ["abs"], [], ["hanging_leg_raise"]],
  ["hanging_leg_raise", "Beinheben hängend", "Hanging Leg Raise", "bodyweight", "bodyweight", "core", ["abs"], ["forearms"], ["cable_crunch", "ab_wheel"]],
  ["ab_wheel", "Ab Roller", "Ab Wheel Rollout", "bodyweight", "bodyweight", "core", ["abs"], ["lats"], ["plank", "hanging_leg_raise"]],
  ["sit_up", "Sit-ups", "Sit-Up", "bodyweight", "bodyweight", "core", ["abs"], [], ["crunch"]],
  ["russian_twist", "Russian Twists", "Russian Twist", "bodyweight", "bodyweight", "core", ["abs"], [], ["woodchopper"]],
  ["side_plank", "Seitstütz", "Side Plank", "bodyweight", "time", "core", ["abs"], ["glutes"], ["plank"]],
  ["lying_leg_raise", "Beinheben liegend", "Lying Leg Raise", "bodyweight", "bodyweight", "core", ["abs"], [], ["hanging_leg_raise"]],
  ["dead_bug", "Dead Bugs", "Dead Bug", "bodyweight", "bodyweight", "core", ["abs"], [], ["plank"]],
  ["mountain_climber", "Mountain Climbers", "Mountain Climber", "bodyweight", "time", "core", ["abs"], ["shoulders", "quads"], ["plank", "burpee"]],
  ["woodchopper", "Holzhacker am Kabel", "Cable Woodchopper", "cable", "weight", "core", ["abs"], ["shoulders"], ["russian_twist", "pallof_press"]],
  ["pallof_press", "Pallof Press", "Pallof Press", "cable", "weight", "core", ["abs"], [], ["woodchopper", "plank"]],
  ["ab_machine", "Bauchmaschine", "Ab Crunch Machine", "machine", "weight", "core", ["abs"], [], ["cable_crunch"]],
  // Cardio
  ["treadmill", "Laufband", "Treadmill", "cardio", "cardio", "cardio", [], [], ["cross_trainer"]],
  ["running", "Laufen (draußen)", "Running", "cardio", "cardio", "cardio", [], [], ["treadmill"]],
  ["rowing_machine", "Rudergerät", "Rowing Machine", "cardio", "cardio", "cardio", [], [], ["bike"]],
  ["bike", "Ergometer", "Stationary Bike", "cardio", "cardio", "cardio", [], [], ["rowing_machine"]],
  ["cross_trainer", "Crosstrainer", "Elliptical", "cardio", "cardio", "cardio", [], [], ["treadmill"]],
  ["stair_climber", "Stepper", "Stair Climber", "cardio", "time", "cardio", [], [], ["cross_trainer"]],
  ["jump_rope", "Seilspringen", "Jump Rope", "cardio", "time", "cardio", [], [], []],
  ["cycling", "Radfahren (draußen)", "Cycling", "cardio", "cardio", "cardio", [], [], ["bike"]],
  ["swimming", "Schwimmen", "Swimming", "cardio", "cardio", "cardio", [], [], ["rowing_machine"]],
  ["walking", "Gehen / Spazieren", "Walking", "cardio", "cardio", "cardio", [], [], ["treadmill"]],
  ["hiking", "Wandern", "Hiking", "cardio", "cardio", "cardio", [], [], ["walking", "stair_climber"]],
  ["ski_erg", "Ski-Ergometer", "Ski Erg", "cardio", "cardio", "cardio", [], [], ["rowing_machine"]],
  ["assault_bike", "Air Bike", "Air Bike", "cardio", "cardio", "cardio", [], [], ["bike"]],
  ["battle_ropes", "Battle Ropes", "Battle Ropes", "cardio", "time", "cardio", ["shoulders"], ["abs"], []],
];

export const builtinExercises: readonly Exercise[] = defs.map(
  ([key, de, en, equipment, metric, pattern, primary, secondary, variants = []]) => ({
    key,
    name: { de, en },
    equipment,
    metric,
    pattern,
    primary,
    secondary,
    variants,
    custom: false,
  }),
);

/** Fallback for sets whose exercise was deleted or not yet synced. */
export const unknownExercise = (key: string): Exercise => ({
  key,
  name: { de: "Unbekannte Übung", en: "Unknown exercise" },
  equipment: "other",
  metric: "weight",
  pattern: "core",
  primary: [],
  secondary: [],
  variants: [],
  custom: true,
});

/** Weight increment per equipment, used by progression suggestions. */
export const incrementKg: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  kettlebell: 4,
  machine: 5,
  egym: 1,
  cable: 2.5,
  bodyweight: 2.5,
  cardio: 0,
  other: 2.5,
};
export const incrementLb: Record<Equipment, number> = {
  barbell: 5,
  dumbbell: 5,
  kettlebell: 8,
  machine: 10,
  egym: 2,
  cable: 5,
  bodyweight: 5,
  cardio: 0,
  other: 5,
};

/** Ready-made circuit matching a typical EGYM session (3 × 20 each). */
export const egymCircuit = [
  "egym_seated_row",
  "egym_abdominal",
  "egym_chest_press",
  "egym_triceps",
  "egym_lat_pulldown",
  "egym_shoulder_press",
  "egym_biceps",
  "egym_adductor",
  "egym_back_extension",
  "egym_leg_curl",
  "egym_leg_extension",
  "egym_abductor",
];
