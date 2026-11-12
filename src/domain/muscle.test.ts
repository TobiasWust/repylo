import { describe, expect, it } from "vitest";
import { muscleDetail } from "./muscle";
import { build, type SetSpec } from "../test/fixtures";

const sets = (n: number): SetSpec[] => Array.from({ length: n }, () => [50, 10]);

describe("muscle detail", () => {
  it("lists the user's exercises for a muscle, most sets first", () => {
    const data = build([
      { daysAgo: 2, exercises: { bench_press: sets(4), triceps_pushdown: sets(5) } },
      { daysAgo: 9, exercises: { bench_press: sets(4) } },
    ]);
    const triceps = muscleDetail(data, "triceps");
    expect(triceps.exercises[0]).toMatchObject({ key: "triceps_pushdown", sets: 5 });
    // Bench press counts half for triceps: 8 sets × 0.5.
    expect(triceps.exercises.find((e) => e.key === "bench_press")?.sets).toBe(4);
  });

  it("suggests exercises for a muscle that gets too little work", () => {
    const data = build([{ daysAgo: 2, exercises: { bench_press: sets(4) } }]);
    const hamstrings = muscleDetail(data, "hamstrings");
    expect(hamstrings.exercises).toEqual([]);
    expect(hamstrings.suggestions.length).toBeGreaterThan(0);
    // Same equipment as what the user already trains with comes first.
    expect(hamstrings.suggestions[0]).toMatch(/rdl|good_morning|deadlift/);
  });

  it("has no suggestions once the weekly target is met", () => {
    const data = build([0, 7, 14, 21].map((daysAgo) => ({ daysAgo, exercises: { leg_curl_seated: sets(12) } })));
    expect(muscleDetail(data, "hamstrings").suggestions).toEqual([]);
  });
});
