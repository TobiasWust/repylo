import { describe, expect, it } from "vitest";
import { nextWeight, suggestProgression } from "./progression";
import { build } from "../test/fixtures";

describe("progression (double progression)", () => {
  it("adds reps while below the top of the range", () => {
    const data = build([
      {
        daysAgo: 2,
        exercises: {
          bench_press: [
            [60, 10],
            [60, 9],
            [60, 8],
          ],
        },
      },
    ]);
    const p = suggestProgression(data, "bench_press")!;
    expect(p.kind).toBe("addReps");
    expect(p.sets.map((s) => s.reps)).toEqual([11, 10, 9]);
    expect(p.sets.every((s) => s.weight === 60)).toBe(true);
  });

  it("raises the weight about 10 % once every set hits the top", () => {
    const data = build([
      {
        daysAgo: 2,
        exercises: {
          bench_press: [
            [60, 12],
            [60, 12],
            [60, 12],
          ],
        },
      },
    ]);
    const p = suggestProgression(data, "bench_press")!;
    expect(p.kind).toBe("addWeight");
    expect(p.sets.every((s) => s.weight === 65 && s.reps === 8)).toBe(true);
  });

  it("uses 1 kg steps on EGYM machines and the exercise's own goal", () => {
    const data = build(
      [
        {
          daysAgo: 2,
          exercises: {
            egym_chest_press: [
              [21, 20],
              [21, 20],
              [21, 20],
            ],
          },
        },
      ],
      {
        exerciseSettings: [{ exerciseKey: "egym_chest_press", goal: "endurance" }],
      },
    );
    const p = suggestProgression(data, "egym_chest_press")!;
    expect(p.kind).toBe("addWeight");
    expect(p.sets[0]).toMatchObject({ weight: 23, reps: 15 });
  });

  it("suggests a deload after two sessions below the range", () => {
    const data = build([
      {
        daysAgo: 2,
        exercises: {
          squat: [
            [100, 6],
            [100, 5],
          ],
        },
      },
      {
        daysAgo: 5,
        exercises: {
          squat: [
            [100, 7],
            [100, 6],
          ],
        },
      },
    ]);
    const p = suggestProgression(data, "squat")!;
    expect(p.kind).toBe("deload");
    expect(p.sets[0]!.weight).toBe(90);
  });
});

describe("weight jump after the top of the range", () => {
  it("keeps the effort of 12 reps for 8 reps on EGYM (50 kg × 12 → 55 kg)", () => {
    expect(nextWeight(50, 12, [8, 12], 1)).toBe(55);
  });

  it("rounds down to the equipment step but always adds at least one", () => {
    expect(nextWeight(100, 6, [3, 6], 2.5)).toBe(107.5);
    expect(nextWeight(8, 12, [8, 12], 2)).toBe(10);
  });

  it("jumps further when the sets went well past the range, up to 20 %", () => {
    expect(nextWeight(50, 16, [8, 12], 1)).toBe(60);
    expect(nextWeight(50, 30, [8, 12], 1)).toBe(60);
  });
});
