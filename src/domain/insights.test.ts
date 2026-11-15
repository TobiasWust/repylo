import { describe, expect, it } from "vitest";
import { builtinExercises } from "./exercises";
import {
  breakBefore,
  comebackRule,
  crammedRule,
  easyRule,
  orderRule,
  overVolumeRule,
  repRangeRule,
  similarRule,
  stretchRule,
  varietyRule,
} from "./insights";
import { movementOf } from "./movement";
import { suggestProgression } from "./progression";
import { today } from "./dates";
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
