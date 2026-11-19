import { describe, expect, it } from "vitest";
import { readinessEffect, readinessOf } from "./readiness";
import { suggestProgression } from "./progression";
import { build } from "../test/fixtures";
import { addDays, today } from "./dates";
import type { Data } from "./model";

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
      {
        daysAgo: 4,
        exercises: {
          squat: [
            [100, 8],
            [100, 8],
            [100, 8],
          ],
        },
      },
    ]);
    const today0 = { ...data.workouts[0]!, sleep: 1, energy: 1 };
    const lowDay = { ...data, workouts: [today0, ...data.workouts.slice(1)] };
    expect(suggestProgression(lowDay, "squat", today0.id)!.kind).toBe("deload");
    expect(suggestProgression(data, "squat", today0.id)!.kind).toBe("addReps");
  });
});

describe("readiness effect", () => {
  /** Workouts every 3 days, oldest first, each with its sleep and energy answers. */
  const history = (entries: [weight: number, sleep: number, energy: number][]): Data => {
    const daysAgo = (i: number) => (entries.length - i) * 3;
    const data = build(entries.map(([weight], i) => ({ daysAgo: daysAgo(i), exercises: { squat: [[weight, 8]] } })));
    const byDate = new Map(entries.map(([, sleep, energy], i) => [addDays(today(), -daysAgo(i)), { sleep, energy }]));
    return { ...data, workouts: data.workouts.map((w) => ({ ...w, ...byDate.get(w.date)! })) };
  };

  it("stays quiet until two levels have enough workouts", () => {
    expect(
      readinessEffect(
        history([
          [100, 2, 2],
          [102, 2, 2],
          [104, 2, 2],
          [106, 2, 2],
        ]),
      ),
    ).toBeNull();
  });

  it("finds weaker tired days, with normal progress taken out", () => {
    // Steady +2 kg progress, but tired days drop 6 kg below the trend.
    const data = history([
      [100, 2, 2],
      [96, 1, 1],
      [104, 2, 2],
      [100, 1, 1],
      [108, 2, 2],
      [104, 1, 1],
      [112, 2, 2],
    ]);
    const effect = readinessEffect(data)!;
    expect(effect.matters).toBe(true);
    expect(effect.levels.find((l) => l.level === "low")!.diff).toBeLessThan(-3);
  });

  it("says when readiness makes no difference", () => {
    const data = history([
      [100, 2, 2],
      [102, 1, 1],
      [104, 2, 2],
      [106, 1, 1],
      [108, 2, 2],
      [110, 1, 1],
      [112, 2, 2],
    ]);
    expect(readinessEffect(data)?.matters).toBe(false);
  });
});
