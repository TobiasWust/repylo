import { describe, expect, it } from "vitest";
import { today, weekStart } from "./dates";
import { type Rows } from "./model";
import { suggestProgression } from "./progression";
import { computeSuggestions, recoveringMuscles, weeksSinceDeload } from "./suggestions";
import { type WorkoutSpec, build, template } from "../test/fixtures";

describe("suggestions", () => {
  it("knows which split comes next", () => {
    const data = build([{ daysAgo: 2, templateId: "t1", exercises: { bench_press: [[60, 8]] } }], {
      templates: [template("t1", "Push", 0, ["bench_press"]), template("t2", "Pull", 1, ["lat_pulldown"])],
    });
    const split = computeSuggestions(data).find((s) => s.kind === "split");
    expect(split?.params.name).toBe("Pull");
    expect(split?.exerciseKeys).toEqual(["lat_pulldown"]);
  });

  it("wraps around to the first split", () => {
    const data = build([{ daysAgo: 2, templateId: "t2", exercises: { lat_pulldown: [[50, 8]] } }], {
      templates: [template("t1", "Push", 0, ["bench_press"]), template("t2", "Pull", 1, ["lat_pulldown"])],
    });
    expect(computeSuggestions(data).find((s) => s.kind === "split")?.params.name).toBe("Push");
  });

  it("does not suggest muscles that were trained hard in the last 48 h", () => {
    const data = build([
      { daysAgo: 0, exercises: { squat: [[100, 5], [100, 5], [100, 5]] } },
      { daysAgo: 6, exercises: { bench_press: [[60, 8]] } },
      { daysAgo: 12, exercises: { bench_press: [[60, 8]] } },
    ]);
    expect(recoveringMuscles(data, today()).has("quads")).toBe(true);
    const keys = computeSuggestions(data).flatMap((s) => s.exerciseKeys);
    expect(keys).not.toContain("squat");
    expect(keys).not.toContain("leg_press");
  });

  it("flags neglected muscle groups", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: [[60, 8], [60, 8], [60, 8]] } },
      { daysAgo: 5, exercises: { bench_press: [[60, 8], [60, 8], [60, 8]] } },
      { daysAgo: 12, exercises: { bench_press: [[60, 8], [60, 8], [60, 8]] } },
    ]);
    const neglected = computeSuggestions(data).filter((s) => s.kind === "neglected");
    expect(neglected.length).toBeGreaterThan(0);
    expect(neglected.map((s) => s.params.muscle)).not.toContain("chest");
  });

  it("brings back exercises that used to be regular", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: [[60, 8]] } },
      { daysAgo: 25, exercises: { squat: [[100, 5]] } },
      { daysAgo: 32, exercises: { squat: [[100, 5]] } },
      { daysAgo: 39, exercises: { squat: [[100, 5]] } },
    ]);
    const missing = computeSuggestions(data).find((s) => s.kind === "missing");
    expect(missing?.exerciseKeys).toContain("squat");
  });

  it("detects a plateau and proposes a variant", () => {
    const data = build([
      { daysAgo: 1, exercises: { bench_press: [[65, 7]] } },
      { daysAgo: 8, exercises: { bench_press: [[65, 7]] } },
      { daysAgo: 15, exercises: { bench_press: [[65, 8]] } },
      { daysAgo: 35, exercises: { bench_press: [[65, 10]] } },
      { daysAgo: 42, exercises: { bench_press: [[60, 8]] } },
    ]);
    const plateau = computeSuggestions(data).find((s) => s.kind === "plateau");
    expect(plateau?.params.exercise).toBe("bench_press");
    expect(plateau?.exerciseKeys).toEqual(["db_bench_press"]);
  });

  it("hides dismissed suggestions until the dismissal expires", () => {
    const rows = { templates: [template("t1", "Push", 0, ["bench_press"]), template("t2", "Pull", 1, ["lat_pulldown"])] };
    const visible = computeSuggestions(build([], rows)).find((s) => s.kind === "split")!;
    const dismissed = build([], { ...rows, dismissals: [{ key: visible.key, until: Date.now() + 1000 }] });
    expect(computeSuggestions(dismissed).some((s) => s.key === visible.key)).toBe(false);
  });
});

describe("planned deload", () => {
  const sevenWeeks: WorkoutSpec[] = Array.from({ length: 7 }, (_, i) => ({ daysAgo: 7 * (i + 1), exercises: { squat: [[100, 8], [100, 8], [100, 8]] } }));

  it("suggests a deload week after six training weeks in a row", () => {
    const data = build(sevenWeeks);
    expect(weeksSinceDeload(data, today())).toBeGreaterThanOrEqual(6);
    expect(computeSuggestions(data).some((s) => s.kind === "deload")).toBe(true);
  });

  it("makes suggestions lighter during the deload week", () => {
    const settings = [{ goal: "hypertrophy", unit: "kg", language: "de", restSeconds: 90, barWeight: 20, weeklyGoal: 3, standards: null, prefill: "last", deloadWeek: weekStart(today()) }];
    const data = build(sevenWeeks, { settings: settings as unknown as Rows["settings"] });
    const p = suggestProgression(data, "squat")!;
    expect(p.kind).toBe("deload");
    expect(p.sets).toHaveLength(2);
    expect(p.sets[0]!.weight).toBe(90);
    expect(computeSuggestions(data).some((s) => s.kind === "deload")).toBe(false);
  });
});
