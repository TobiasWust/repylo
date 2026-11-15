import { describe, expect, it } from "vitest";
import { builtinExercises } from "./exercises";
import {
  breakBefore,
  comebackRule,
  crammedRule,
  easyRule,
  jumpRule,
  longRule,
  orderRule,
  overVolumeRule,
  repRangeRule,
  similarRule,
  stretchRule,
  varietyRule,
} from "./insights";
import { movementOf } from "./movement";
import { suggestProgression } from "./progression";
import { addDays, today } from "./dates";
import type { Data } from "./model";
import { looksUnchecked } from "./stats";
import { allSuggestions } from "./suggestions";
import { build, type SetSpec, type WorkoutSpec } from "../test/fixtures";

const sets = (n: number, weight: number | null, reps: number): SetSpec[] => Array.from({ length: n }, () => [weight, reps]);
const now = today();
const none = new Set<never>();
const settings = (goal: string) => ({
  settings: [
    {
      goal,
      unit: "kg",
      language: "de",
      restSeconds: 90,
      barWeight: 20,
      weeklyGoal: 1,
      standards: "male",
      prefill: "last",
      deloadWeek: null,
      effortCheck: null,
    },
  ],
});
/** Older workouts so the history counts as established. */
const history: WorkoutSpec[] = [
  { daysAgo: 20, exercises: { plank: sets(1, null, 1) } },
  { daysAgo: 25, exercises: { plank: sets(1, null, 1) } },
];

describe("movement classes", () => {
  it("cover every built-in strength exercise", () => {
    const missing = builtinExercises.filter((e) => e.pattern !== "cardio" && movementOf(e.key) === null).map((e) => e.key);
    expect(missing).toEqual([]);
  });
});

describe("insights", () => {
  it("flags far more weekly sets than the goal's range", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: sets(8, 60, 10), db_fly: sets(6, 15, 12) } },
      { daysAgo: 4, exercises: { incline_db_press: sets(8, 25, 10), cable_fly: sets(6, 15, 12) } },
      ...history,
    ]);
    expect(overVolumeRule(data, now)[0]?.params).toMatchObject({ muscle: "chest", sets: 28 });
    // 16 sets is within a hypertrophy range.
    const fine = build([{ daysAgo: 1, exercises: { bench_press: sets(8, 60, 10), db_fly: sets(8, 15, 12) } }, ...history]);
    expect(overVolumeRule(fine, now)).toEqual([]);
  });

  it("flags a muscle's whole week crammed into one session", () => {
    const data = build([
      { daysAgo: 2, exercises: { squat: sets(5, 100, 5), leg_press: sets(4, 150, 10), leg_extension: sets(4, 50, 12) } },
    ]);
    expect(crammedRule(data, now)[0]?.params).toMatchObject({ muscle: "quads", sets: 13 });
    const spread = build([
      { daysAgo: 2, exercises: { squat: sets(5, 100, 5), leg_press: sets(4, 150, 10), leg_extension: sets(4, 50, 12) } },
      { daysAgo: 4, exercises: { front_squat: sets(5, 80, 5) } },
    ]);
    expect(crammedRule(spread, now)).toEqual([]);
  });

  it("flags near-identical exercises in one workout and offers another angle", () => {
    const data = build([{ daysAgo: 1, exercises: { lateral_raise: sets(3, 8, 12), cable_lateral_raise: sets(3, 5, 12) } }]);
    const [hint] = similarRule(data, now);
    expect(hint?.params).toMatchObject({ first: "cable_lateral_raise", second: "lateral_raise", count: 2 });
    expect(hint?.exerciseKeys.every((k) => movementOf(k) !== "lateralRaise")).toBe(true);
    // Two flat presses are a normal workout; three are not.
    expect(similarRule(build([{ daysAgo: 1, exercises: { bench_press: sets(3, 60, 8), db_bench_press: sets(3, 25, 10) } }]), now)).toEqual(
      [],
    );
    expect(
      similarRule(
        build([
          { daysAgo: 1, exercises: { bench_press: sets(3, 60, 8), db_bench_press: sets(3, 25, 10), machine_chest_press: sets(3, 50, 10) } },
        ]),
        now,
      ),
    ).toHaveLength(1);
  });

  it("suggests another movement when a muscle only ever gets one", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: sets(4, 60, 8) } },
      { daysAgo: 5, exercises: { db_bench_press: sets(4, 25, 10) } },
      { daysAgo: 9, exercises: { bench_press: sets(4, 60, 8) } },
      ...history,
    ]);
    const [hint] = varietyRule(data, now, none);
    expect(hint?.params.muscle).toBe("chest");
    expect(hint?.exerciseKeys.every((k) => movementOf(k) !== "flatPress")).toBe(true);
    const varied = build([
      { daysAgo: 1, exercises: { bench_press: sets(4, 60, 8) } },
      { daysAgo: 5, exercises: { cable_fly: sets(4, 15, 12) } },
      ...history,
    ]);
    expect(varietyRule(varied, now, none).some((s) => s.params.muscle === "chest")).toBe(false);
  });

  it("suggests a lengthened exercise when a muscle is only trained short", () => {
    const data = build([
      { daysAgo: 1, exercises: { triceps_pushdown: sets(4, 30, 12) } },
      { daysAgo: 5, exercises: { triceps_pushdown: sets(4, 30, 12) } },
      ...history,
    ]);
    const [hint] = stretchRule(data, now, none);
    expect(hint?.params).toMatchObject({ muscle: "triceps", exercise: "triceps_pushdown" });
    expect(hint?.exerciseKeys).toEqual(expect.arrayContaining(["overhead_triceps"]));
    const long = build([
      { daysAgo: 1, exercises: { triceps_pushdown: sets(4, 30, 12), overhead_triceps: sets(3, 25, 12) } },
      { daysAgo: 5, exercises: { triceps_pushdown: sets(4, 30, 12) } },
      ...history,
    ]);
    expect(stretchRule(long, now, none)).toEqual([]);
  });

  it("notices when most exercises felt easy", () => {
    const specs: WorkoutSpec[] = [1, 3, 5].map((daysAgo) => ({
      daysAgo,
      exercises: { bench_press: sets(3, 60, 10), barbell_row: sets(3, 60, 10) },
      effort: { bench_press: 1, barbell_row: 1 },
    }));
    expect(easyRule(build(specs), now)[0]?.params).toMatchObject({ easy: 6, total: 6 });
    const right = specs.map((s) => ({ ...s, effort: { bench_press: 2, barbell_row: 1 } }));
    expect(easyRule(build(right), now)).toEqual([]);
  });

  it("flags light sets on main lifts for a strength goal", () => {
    const light: WorkoutSpec[] = [1, 4].map((daysAgo) => ({
      daysAgo,
      exercises: { squat: sets(4, 80, 10), bench_press: sets(4, 60, 10) },
    }));
    expect(repRangeRule(build(light, settings("strength")), now)[0]?.params.goal).toBe("strength");
    expect(repRangeRule(build(light, settings("hypertrophy")), now)).toEqual([]);
    const heavy = light.map((s) => ({ ...s, exercises: { squat: sets(4, 120, 5), bench_press: sets(4, 90, 5) } }));
    expect(repRangeRule(build(heavy, settings("strength")), now)).toEqual([]);
  });

  it("flags very light loads for muscle growth", () => {
    const light: WorkoutSpec[] = [1, 4].map((daysAgo) => ({ daysAgo, exercises: { leg_press: sets(6, 40, 40), db_curl: sets(6, 4, 35) } }));
    expect(repRangeRule(build(light), now)[0]?.params.goal).toBe("hypertrophy");
  });

  it("flags a strength lift that always comes after small exercises", () => {
    const late: WorkoutSpec[] = [1, 5, 9].map((daysAgo) => ({
      daysAgo,
      exercises: { db_curl: sets(3, 12, 10), lateral_raise: sets(3, 8, 12), squat: sets(4, 100, 5) },
    }));
    expect(orderRule(build(late, settings("strength")), now)[0]?.params.exercise).toBe("squat");
    expect(orderRule(build(late, settings("hypertrophy")), now)).toEqual([]);
    const first = late.map((s) => ({
      ...s,
      exercises: { squat: sets(4, 100, 5), db_curl: sets(3, 12, 10), lateral_raise: sets(3, 8, 12) },
    }));
    expect(orderRule(build(first, settings("strength")), now)).toEqual([]);
  });

  it("welcomes you back after three weeks off and lightens the weights", () => {
    const data = build([
      { daysAgo: 30, exercises: { bench_press: sets(3, 100, 8) } },
      { daysAgo: 33, exercises: { bench_press: sets(3, 100, 8) } },
      { daysAgo: 36, exercises: { bench_press: sets(3, 97.5, 8) } },
      { daysAgo: 39, exercises: { bench_press: sets(3, 95, 8) } },
    ]);
    expect(breakBefore(data, now)).toBe(30);
    expect(comebackRule(data, now)[0]?.params.weeks).toBe(4);
    const progression = suggestProgression(data, "bench_press");
    expect(progression?.kind).toBe("comeback");
    expect(progression?.sets[0]?.weight).toBe(90);
    // A normal week off is no comeback.
    const recent = build([{ daysAgo: 7, exercises: { bench_press: sets(3, 100, 8) } }, ...history, ...history]);
    expect(comebackRule(recent, now)).toEqual([]);
    expect(suggestProgression(recent, "bench_press")?.kind).not.toBe("comeback");
  });
});

/** Gives each workout a live start at `hour` on its own day, lasting `minutes`. */
const timed = (data: Data, hour: number, minutes: number | null): Data => ({
  ...data,
  workouts: data.workouts.map((w) => {
    const start = new Date(`${w.date}T${String(hour).padStart(2, "0")}:00`).getTime();
    return { ...w, startedAt: start, finishedAt: minutes === null ? null : start + minutes * 60_000 };
  }),
});

describe("more insights", () => {
  it("speaks up about exercise choice even while the muscle recovers, as a note", () => {
    const data = build([
      { daysAgo: 1, exercises: { triceps_pushdown: sets(4, 30, 12) } },
      { daysAgo: 5, exercises: { triceps_pushdown: sets(4, 30, 12) } },
      ...history,
    ]);
    const [hint] = stretchRule(data, now, new Set(["triceps"]));
    expect(hint?.info).toBe(true);
    expect(stretchRule(data, now, none)[0]?.info).toBeUndefined();
  });

  it("counts the seated EGYM leg curl as a lengthened hamstring exercise", () => {
    const data = build([
      { daysAgo: 1, exercises: { egym_leg_curl: sets(3, 30, 10) } },
      { daysAgo: 5, exercises: { egym_leg_curl: sets(3, 30, 10) } },
      ...history,
    ]);
    expect(stretchRule(data, now, none).some((s) => s.params.muscle === "hamstrings")).toBe(false);
  });

  it("leaves upper back out of the variety check", () => {
    const data = build([
      { daysAgo: 1, exercises: { cable_row: sets(4, 50, 10) } },
      { daysAgo: 5, exercises: { machine_row: sets(4, 50, 10) } },
      ...history,
    ]);
    expect(varietyRule(data, now, none).some((s) => s.params.muscle === "upperBack")).toBe(false);
  });

  it("flags a big lift at the end of long workouts for growth goals too", () => {
    const small = {
      lateral_raise: 0,
      db_curl: 0,
      triceps_pushdown: 0,
      leg_extension: 0,
      leg_curl_lying: 0,
      cable_fly: 0,
      face_pull: 0,
      hammer_curl: 0,
      calf_raise_standing: 0,
    };
    const exercises = Object.fromEntries([...Object.keys(small).map((k) => [k, sets(3, 10, 12)]), ["squat", sets(3, 80, 10)]]);
    const late: WorkoutSpec[] = [1, 4].map((daysAgo) => ({ daysAgo, exercises }));
    expect(orderRule(build(late), now)[0]?.params).toMatchObject({ exercise: "squat", goal: "growth", before: 9 });
    // Short workouts: order hardly matters for growth.
    expect(orderRule(build(late.map((s) => ({ ...s, exercises: { db_curl: sets(3, 10, 12), squat: sets(3, 80, 10) } }))), now)).toEqual([]);
  });

  it("notices estimated maxes jumping on several exercises at once", () => {
    const data = build([
      { daysAgo: 1, exercises: { egym_chest_press: sets(3, 42, 8), egym_triceps: sets(3, 67, 8), egym_shoulder_press: sets(3, 48, 8) } },
      { daysAgo: 4, exercises: { egym_chest_press: sets(3, 28, 13), egym_triceps: sets(3, 47, 13), egym_shoulder_press: sets(3, 36, 13) } },
    ]);
    expect(jumpRule(data, now)[0]?.params).toMatchObject({ count: 3, exercise: "egym_chest_press", percent: 36 });
    const steady = build([
      { daysAgo: 1, exercises: { egym_chest_press: sets(3, 30, 13), egym_triceps: sets(3, 48, 13), egym_shoulder_press: sets(3, 37, 13) } },
      { daysAgo: 4, exercises: { egym_chest_press: sets(3, 28, 13), egym_triceps: sets(3, 47, 13), egym_shoulder_press: sets(3, 36, 13) } },
    ]);
    expect(jumpRule(steady, now)).toEqual([]);
  });

  it("flags long sessions with many sets", () => {
    const big = Object.fromEntries(
      [
        "bench_press",
        "lat_pulldown",
        "squat",
        "rdl",
        "overhead_press",
        "cable_row",
        "db_curl",
        "triceps_pushdown",
        "leg_curl_lying",
        "lateral_raise",
        "calf_raise_standing",
        "ab_machine",
        "hip_thrust",
        "leg_extension",
      ].map((k) => [k, sets(3, 20, 10)]),
    );
    const specs: WorkoutSpec[] = [1, 4, 8].map((daysAgo) => ({ daysAgo, exercises: big }));
    expect(longRule(timed(build(specs), 17, 120), now)[0]?.params).toMatchObject({ minutes: 120, sets: 42 });
    expect(longRule(timed(build(specs), 17, 60), now)).toEqual([]);
  });

  it("asks about a workout closed right away with nothing ticked off", () => {
    const base = timed(build([{ daysAgo: 2, exercises: { bench_press: sets(3, 60, 8) } }]), 1, 0);
    const untouched = {
      ...base,
      workouts: base.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.map((x) => ({ ...x, done: false })) })),
      })),
    };
    expect(looksUnchecked(untouched.workouts[0]!)).toBe(true);
    expect(allSuggestions(untouched).find((s) => s.kind === "unchecked")?.params.date).toBe(addDays(now, -2));
    // Ticked off, or a real session length: nothing to ask.
    expect(looksUnchecked(base.workouts[0]!)).toBe(false);
    expect(looksUnchecked(timed(untouched, 1, 45).workouts[0]!)).toBe(false);
  });
});
