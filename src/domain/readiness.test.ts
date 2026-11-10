import { describe, expect, it } from "vitest";
import { readinessOf } from "./readiness";
import { suggestProgression } from "./progression";
import { build } from "../test/fixtures";

describe("readiness", () => {
  it("rates sleep + energy and treats skipped as unknown", () => {
    expect(readinessOf({ sleep: 1, energy: 2 })).toBe("low");
    expect(readinessOf({ sleep: 2, energy: 2 })).toBe("mid");
    expect(readinessOf({ sleep: 3, energy: 3 })).toBe("high");
    expect(readinessOf({ sleep: 0, energy: 0 })).toBeNull();
  });

  it("suggests lighter weights on a low-readiness day", () => {
    const data = build([
      { daysAgo: 0, exercises: { squat: [[100, 8]] } },
      { daysAgo: 4, exercises: { squat: [[100, 8], [100, 8], [100, 8]] } },
    ]);
    const today0 = { ...data.workouts[0]!, sleep: 1, energy: 1 };
    const lowDay = { ...data, workouts: [today0, ...data.workouts.slice(1)] };
    expect(suggestProgression(lowDay, "squat", today0.id)!.kind).toBe("deload");
    expect(suggestProgression(data, "squat", today0.id)!.kind).toBe("addReps");
  });
});
