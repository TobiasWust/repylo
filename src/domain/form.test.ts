import { describe, expect, it } from "vitest";
import { formLevel, formSeries } from "./form";
import { build, type SetSpec } from "../test/fixtures";

const sets = (n: number): SetSpec[] => Array.from({ length: n }, () => [50, 10]);

describe("form (fitness – fatigue)", () => {
  it("is empty without training", () => {
    expect(formSeries(build([]))).toEqual([]);
  });

  it("drops after a workout and climbs again on rest days", () => {
    const history = [20, 17, 14, 11, 8, 5, 3].map((daysAgo) => ({ daysAgo, exercises: { squat: sets(15) } }));
    const series = formSeries(build(history), 10);
    const at = (daysAgo: number) => series[series.length - 1 - daysAgo]!;
    // The workout three days ago pulled form down; every rest day since lifts it.
    expect(at(3).form).toBeLessThan(at(4).form);
    expect(at(2).form).toBeGreaterThan(at(3).form);
    expect(at(0).form).toBeGreaterThan(at(1).form);
    // Fitness stays positive and fades only slowly.
    expect(at(0).fitness).toBeGreaterThan(0);
    expect(at(0).fitness).toBeGreaterThan(at(3).fitness * 0.9);
  });

  it("reads hard training as strained and a long break as fresh", () => {
    const hard = build([0, 1, 2, 3].map((daysAgo) => ({ daysAgo, exercises: { squat: sets(30) } })));
    expect(formLevel(formSeries(hard).at(-1)!)).toBe("strained");
    const rested = build([30, 27, 24].map((daysAgo) => ({ daysAgo, exercises: { squat: sets(20) } })));
    expect(formLevel(formSeries(rested).at(-1)!)).toBe("fresh");
  });
});
