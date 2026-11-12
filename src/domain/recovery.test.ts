import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  const morning = () => new Date().setHours(7, 0, 0, 0);
  const normalSession = { squat: sets(4), bench_press: sets(4), barbell_row: sets(4), overhead_press: sets(3), rdl: sets(3) };

  it("has a normal session's muscles ready on the second morning, whatever the training time", () => {
    const quads = (daysAgo: number) =>
      muscleRecovery(build([{ daysAgo, exercises: { squat: sets(6) } }]), morning()).find((r) => r.muscle === "quads")!;
    expect(quads(1).hoursLeft).toBeGreaterThan(0);
    expect(quads(2).hoursLeft).toBe(0);
  });

  it("keeps three days only for very high volume", () => {
    const quads = muscleRecovery(build([{ daysAgo: 2, exercises: { squat: sets(10) } }]), morning()).find((r) => r.muscle === "quads")!;
    expect(quads.hoursLeft).toBeGreaterThan(0);
  });

  it("counts every big muscle as rested two days after a normal full-body session", () => {
    const advice = (daysAgo: number) => dailyAdvice(build([{ daysAgo, exercises: normalSession }]), morning());
    expect(advice(1).tired.length).toBeGreaterThan(0);
    expect(advice(2).tired).toEqual([]);
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

describe("daily advice keeps the weekly pace", () => {
  // Thursday morning: with a goal of 4, two workouts should be done by tonight.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T07:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  const legDay = { squat: sets(6), rdl: sets(6), hip_thrust: sets(4), calf_raise_standing: sets(4) };

  it("trains the rested muscles when behind the pace", () => {
    const advice = dailyAdvice(build([{ daysAgo: 1, exercises: legDay }], { settings: withGoal(4) }));
    expect(advice).toMatchObject({ train: true, reason: "catchUp" });
    expect(advice.fresh).toContain("chest");
    expect(advice.tired.map((r) => r.muscle)).toContain("quads");
  });

  it("still rests tired muscles when on pace", () => {
    const fullBody = { squat: sets(4), bench_press: sets(4), barbell_row: sets(4), overhead_press: sets(3), rdl: sets(3) };
    const advice = dailyAdvice(build([{ daysAgo: 1, exercises: fullBody }], { settings: withGoal(2) }));
    expect(advice).toMatchObject({ train: false, reason: "recovering" });
  });
});
