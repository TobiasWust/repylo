import { describe, expect, it } from "vitest";
import { initialSets } from "./workoutOps";
import { type Rows } from "../domain/model";
import { type WorkoutSpec, build } from "../test/fixtures";

describe("prefill", () => {
  const history: WorkoutSpec[] = [
    {
      daysAgo: 3,
      exercises: {
        bench_press: [
          [60, 12],
          [60, 12],
          [60, 12],
        ],
      },
    },
  ];
  const settings = (prefill: string) => [
    { goal: "hypertrophy", unit: "kg", language: "de", restSeconds: 90, barWeight: 20, weeklyGoal: 3, standards: null, prefill },
  ];

  it("uses last time's values by default", () => {
    expect(initialSets(build(history), "bench_press")[0]).toMatchObject({ weight: 60, reps: 12 });
  });

  it("uses the progression target when chosen", () => {
    const data = build(history, { settings: settings("target") as unknown as Rows["settings"] });
    expect(initialSets(data, "bench_press")[0]).toMatchObject({ weight: 62.5, reps: 8 });
  });
});
