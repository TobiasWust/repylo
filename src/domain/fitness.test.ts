import { describe, expect, it } from "vitest";
import { fitnessSeries } from "./fitness";
import { build, type SetSpec } from "../test/fixtures";

const sets = (n: number): SetSpec[] => Array.from({ length: n }, () => [50, 10]);

describe("training level", () => {
  it("is empty without training", () => {
    expect(fitnessSeries(build([]))).toEqual([]);
  });

  it("settles at the weekly sets you train", () => {
    // 3 workouts × 16 sets every week for half a year → about 48 sets per week.
    const history = Array.from({ length: 26 * 3 }, (_, i) => ({
      daysAgo: Math.floor(i / 3) * 7 + [1, 3, 5][i % 3]!,
      exercises: { squat: sets(16) },
    }));
    const level = fitnessSeries(build(history)).at(-1)!.level;
    expect(level).toBeGreaterThan(42);
    expect(level).toBeLessThan(54);
  });

  it("rises on a training day and sinks slowly on rest days", () => {
    const series = fitnessSeries(build([5, 3].map((daysAgo) => ({ daysAgo, exercises: { squat: sets(20) } }))), 10);
    const at = (daysAgo: number) => series[series.length - 1 - daysAgo]!.level;
    expect(at(3)).toBeGreaterThan(at(4));
    expect(at(2)).toBeLessThan(at(3));
    // Slowly: a rest day costs only a few percent.
    expect(at(2)).toBeGreaterThan(at(3) * 0.95);
  });
});
