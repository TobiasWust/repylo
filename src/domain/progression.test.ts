import { describe, expect, it } from "vitest";
import { suggestProgression } from "./progression";
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

  it("adds the equipment increment once every set hits the top", () => {
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
    expect(p.sets.every((s) => s.weight === 62.5 && s.reps === 8)).toBe(true);
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
    expect(p.sets[0]).toMatchObject({ weight: 22, reps: 15 });
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
