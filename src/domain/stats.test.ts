import { describe, expect, it } from "vitest";
import { addDays, today, weekStart, daysBetween } from "./dates";
import { suggestProgression } from "./progression";
import { detectPrs, e1rm, exerciseSessions, records, setsPerMuscle, strengthChange, weekStreak, workoutsPerWeek } from "./stats";
import { build } from "../test/fixtures";

describe("stats", () => {
  it("estimates 1RM with Epley and treats single reps as the weight itself", () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 10)).toBeCloseTo(133.3, 1);
    expect(e1rm(100, 20)).toBe(e1rm(100, 12)); // clamped
  });

  it("keeps only real rep records", () => {
    const data = build([
      {
        daysAgo: 3,
        exercises: {
          bench_press: [
            [65, 10],
            [65, 8],
            [70, 5],
          ],
        },
      },
    ]);
    const best = records(exerciseSessions(data, "bench_press"));
    expect([...best.byReps]).toEqual([
      [10, 65],
      [5, 70],
    ]);
  });

  it("counts secondary muscles as half sets", () => {
    const data = build([
      {
        daysAgo: 0,
        exercises: {
          bench_press: [
            [60, 8],
            [60, 8],
          ],
        },
      },
    ]);
    const sets = setsPerMuscle(data, addDays(today(), -6));
    expect(sets.get("chest")).toBe(2);
    expect(sets.get("triceps")).toBe(1);
  });

  it("counts week streaks without breaking on the current, still open week", () => {
    const thisMonday = weekStart(today());
    const days = new Set([addDays(thisMonday, -7), addDays(thisMonday, -14)]);
    expect(weekStreak(days)).toBe(2);
  });

  it("only counts weeks that reach the weekly goal", () => {
    const monday = weekStart(today());
    const days = new Set([addDays(monday, -7), addDays(monday, -6), addDays(monday, -14)]);
    expect(weekStreak(days, 2)).toBe(1);
    expect(weekStreak(days, 1)).toBe(2);
  });

  it("detects PRs only when there is history to beat", () => {
    const first = build([{ daysAgo: 0, exercises: { squat: [[100, 5]] } }]);
    const set = first.workouts[0]!.exercises[0]!.sets[0]!;
    expect(detectPrs(first, first.workouts[0]!.id, set)).toEqual([]);

    const data = build([
      { daysAgo: 0, exercises: { squat: [[105, 5]] } },
      { daysAgo: 3, exercises: { squat: [[100, 5]] } },
    ]);
    const today0 = data.workouts[0]!;
    expect(detectPrs(data, today0.id, today0.exercises[0]!.sets[0]!)[0]?.kind).toBe("weight");
  });
});

describe("backfilled workouts", () => {
  const data = build([
    { daysAgo: 1, exercises: { squat: [[110, 5]] } },
    { daysAgo: 10, exercises: { squat: [[100, 5]] } }, // being backfilled
    { daysAgo: 20, exercises: { squat: [[90, 5]] } },
  ]);
  const backfilled = data.workouts[1]!;

  it("only sees sessions before the workout as history", () => {
    expect(exerciseSessions(data, "squat", backfilled.id).map((s) => s.topWeight)).toEqual([90]);
  });

  it("bases progression on what came before, not after", () => {
    expect(suggestProgression(data, "squat", backfilled.id)!.last.topWeight).toBe(90);
  });

  it("judges PRs against the past at that time", () => {
    expect(detectPrs(data, backfilled.id, backfilled.exercises[0]!.sets[0]!)[0]?.kind).toBe("weight");
  });
});

describe("workouts per week", () => {
  it("starts averaging at the first workout and skips the running week", () => {
    const monday = weekStart(today());
    const data = build([
      { daysAgo: daysBetween(addDays(monday, -14), today()), exercises: { squat: [[100, 5]] } },
      { daysAgo: daysBetween(addDays(monday, -12), today()), exercises: { squat: [[100, 5]] } },
      { daysAgo: daysBetween(addDays(monday, -7), today()), exercises: { squat: [[100, 5]] } },
    ]);
    expect(workoutsPerWeek(data)).toEqual({ average: 1.5, weeks: 2 });
  });
});

describe("strength change", () => {
  it("averages each exercise's est. 1RM change against its last session before the range", () => {
    const data = build([
      { daysAgo: 70, exercises: { squat: [[100, 5]], bench_press: [[60, 5]] } },
      { daysAgo: 30, exercises: { squat: [[105, 5]] } },
      { daysAgo: 2, exercises: { squat: [[110, 5]], bench_press: [[66, 5]] } },
    ]);
    const change = strengthChange(data, addDays(today(), -55), today())!;
    // Squat 100 → 110 (+10 %), bench 60 → 66 (+10 %).
    expect(change.exercises).toBe(2);
    expect(change.percent).toBeCloseTo(10);
  });

  it("is null without two sessions to compare", () => {
    expect(strengthChange(build([{ daysAgo: 2, exercises: { squat: [[100, 5]] } }]), addDays(today(), -55), today())).toBeNull();
  });
});
