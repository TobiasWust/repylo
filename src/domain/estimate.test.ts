import { describe, expect, it } from "vitest";
import { initialSets } from "../ui/workoutOps";
import { estimateStart } from "./estimate";
import { build } from "../test/fixtures";

describe("start estimates", () => {
  it("uses a slightly lighter average without any history", () => {
    const e = estimateStart(build([]), "bench_press")!;
    expect(e.basedOn).toEqual([]);
    expect(e.sets[0]).toMatchObject({ weight: 35, reps: 10 });
  });

  it("scales from the user's strength on similar exercises", () => {
    // 75 kg × 10 ≈ 100 kg est. 1RM on bench: about 1.5× the average lifter.
    const data = build([{ daysAgo: 3, exercises: { bench_press: [[75, 10]], db_curl: [[13, 10]] } }]);
    const e = estimateStart(data, "incline_bench_press")!;
    expect(e.basedOn[0]).toBe("bench_press");
    expect(e.sets[0]!.weight).toBeGreaterThanOrEqual(50);
    expect(e.sets[0]!.weight).toBeLessThanOrEqual(60);
  });

  it("pre-fills new exercises with the estimate", () => {
    expect(initialSets(build([]), "lat_pulldown")[0]!.weight).toBeGreaterThan(0);
  });
});
