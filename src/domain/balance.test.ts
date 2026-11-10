import { describe, expect, it } from "vitest";
import { balanceChecks, imbalances } from "./balance";
import { build } from "../test/fixtures";
import type { SetSpec } from "../test/fixtures";

const sets = (n: number): SetSpec[] => Array.from({ length: n }, () => [50, 10]);

describe("balance", () => {
  it("reports nothing when both sides get similar work", () => {
    const data = build([
      { daysAgo: 2, exercises: { bench_press: sets(4), lat_pulldown: sets(4), leg_extension: sets(4), leg_curl_lying: sets(4) } },
    ]);
    expect(imbalances(balanceChecks(data))).toEqual([]);
  });

  it("flags the weaker side, worst first", () => {
    const data = build([
      { daysAgo: 1, exercises: { leg_extension: sets(3), leg_curl_lying: sets(9) } },
      { daysAgo: 4, exercises: { bench_press: sets(10), lat_pulldown: sets(3) } },
    ]);
    const off = imbalances(balanceChecks(data));
    expect(off.map((c) => [c.key, c.weaker])).toEqual(
      expect.arrayContaining([
        ["pushPull", "right"],
        ["quadsHamstrings", "left"],
      ]),
    );
    expect(off[0]!.factor).toBeGreaterThanOrEqual(off.at(-1)!.factor);
  });

  it("skips pairs with too little data and ignores old workouts", () => {
    const data = build([
      { daysAgo: 1, exercises: { barbell_curl: sets(2) } },
      { daysAgo: 20, exercises: { bench_press: sets(12) } },
    ]);
    const keys = balanceChecks(data).map((c) => c.key);
    expect(keys).not.toContain("bicepsTriceps");
    expect(keys).not.toContain("pushPull");
  });

  it("treats 1.5 : 1 upper to lower body as even", () => {
    const data = build([{ daysAgo: 1, exercises: { bench_press: sets(6), barbell_row: sets(6), squat: sets(8) } }]);
    const upperLower = balanceChecks(data).find((c) => c.key === "upperLower");
    expect(upperLower?.weaker).toBeNull();
  });
});
