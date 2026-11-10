import { describe, expect, it } from "vitest";
import type { Rows } from "./model";
import { dailyAdvice, muscleRecovery } from "./recovery";
import { build, type SetSpec } from "../test/fixtures";

const sets = (n: number): SetSpec[] => Array.from({ length: n }, () => [50, 10]);
const withGoal = (weeklyGoal: number) =>
  [
    {
      goal: "hypertrophy",
      unit: "kg",
      language: "de",
      restSeconds: 90,
      barWeight: 20,
      weeklyGoal,
      standards: null,
      prefill: "last",
      deloadWeek: null,
    },
  ] as unknown as Rows["settings"];

describe("muscle recovery", () => {
  it("keeps hard-trained muscles recovering and leaves the others ready", () => {
    const data = build([{ daysAgo: 1, exercises: { squat: sets(6) } }]);
    const byMuscle = new Map(muscleRecovery(data).map((r) => [r.muscle, r]));
    expect(byMuscle.get("quads")!.hoursLeft).toBeGreaterThan(0);
    expect(byMuscle.get("chest")!.hoursLeft).toBe(0);
    expect(byMuscle.get("chest")!.lastTrained).toBeNull();
  });
});

describe("daily advice", () => {
  it("says rest once today's workout is done", () => {
    expect(dailyAdvice(build([{ daysAgo: 0, exercises: { squat: sets(3) } }])).reason).toBe("done");
  });

  it("asks to train when the weekly goal needs every remaining day", () => {
    const advice = dailyAdvice(build([], { settings: withGoal(7) }));
    expect(advice).toMatchObject({ train: true, reason: "goalAtRisk" });
  });

  it("suggests a rest day after two training days in a row", () => {
    const data = build([
      { daysAgo: 1, exercises: { db_curl: sets(1) } },
      { daysAgo: 2, exercises: { db_curl: sets(1) } },
    ]);
    expect(dailyAdvice(data)).toMatchObject({ train: false, reason: "backToBack" });
  });

  it("suggests rest while most big muscles are still recovering", () => {
    const fullBody = {
      squat: sets(6),
      rdl: sets(6),
      bench_press: sets(6),
      barbell_row: sets(6),
      overhead_press: sets(6),
      lat_pulldown: sets(6),
      db_curl: sets(6),
      triceps_pushdown: sets(6),
      hip_thrust: sets(6),
      calf_raise_standing: sets(6),
      cable_crunch: sets(6),
    };
    expect(dailyAdvice(build([{ daysAgo: 1, exercises: fullBody }])).reason).toBe("recovering");
  });
});
