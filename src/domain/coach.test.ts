import { describe, expect, it } from "vitest";

import { setFeedback, workoutSummary } from "./coach";
import { e1rm } from "./stats";

import { type SetSpec, build } from "../test/fixtures";

describe("coach feedback", () => {
  const doneData = (today: SetSpec[]) => {
    const data = build([
      { daysAgo: 0, exercises: { bench_press: today } },
      {
        daysAgo: 7,
        exercises: {
          bench_press: [
            [60, 10],
            [60, 9],
            [60, 8],
          ],
        },
      },
    ]);
    const w = data.workouts[0]!;
    return { data, w, sets: w.exercises[0]!.sets };
  };

  it("praises more reps at the same weight and sets a target for the next set", () => {
    const { data, w, sets } = doneData([
      [60, 11],
      [60, 9],
      [60, 8],
    ]);
    const onlyFirstDone = sets.map((s, i) => ({ ...s, done: i === 0 }));
    const fb = setFeedback(data, w.id, "bench_press", onlyFirstDone)!;
    expect(fb.kind).toBe("moreReps");
    expect(fb.delta).toBe(1);
    expect(fb.next?.reps).toBe(10);
  });

  it("notices heavier and fewer-rep sets", () => {
    const { data, w, sets } = doneData([
      [62.5, 8],
      [60, 7],
      [60, 8],
    ]);
    expect(setFeedback(data, w.id, "bench_press", sets.slice(0, 1))!.kind).toBe("heavier");
    expect(setFeedback(data, w.id, "bench_press", sets.slice(0, 2))!.kind).toBe("fewerReps");
  });
});

describe("workout summary", () => {
  it("counts sets, volume, gains and records", () => {
    const data = build([
      {
        daysAgo: 0,
        exercises: {
          squat: [
            [105, 5],
            [105, 5],
          ],
          bench_press: [[60, 8]],
        },
      },
      { daysAgo: 4, exercises: { squat: [[100, 5]], bench_press: [[60, 10]] } },
    ]);
    const s = workoutSummary(data, data.workouts[0]!.id)!;
    expect(s.sets).toBe(3);
    expect(s.volume).toBe(105 * 5 * 2 + 60 * 8);
    expect(s.gains.map((g) => g.exerciseKey)).toEqual(["squat"]);
    expect(s.records).toEqual(["squat"]);
    // squat +5 %, bench 60×8 vs 60×10 ≈ −5 % → about 0 on average
    expect(s.averageChange).toBeCloseTo((5 + ((e1rm(60, 8) - e1rm(60, 10)) / e1rm(60, 10)) * 100) / 2, 5);
  });
});
