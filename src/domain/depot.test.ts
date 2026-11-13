import { describe, expect, it } from "vitest";
import { addDays, today } from "./dates";
import { positions, strengthIndex } from "./depot";
import { build } from "../test/fixtures";

const from = addDays(today(), -29);

describe("strength depot", () => {
  const data = build([
    { daysAgo: 40, exercises: { squat: [[100, 5]], bench_press: [[60, 5]], plank: [[null, 0]] } },
    { daysAgo: 20, exercises: { squat: [[105, 5]] } },
    { daysAgo: 5, exercises: { squat: [[110, 5]], bench_press: [[57, 5]] } },
  ]);

  it("tracks each exercise against where it stood when the period began", () => {
    const list = positions(data, from, today());
    expect(list.map((p) => p.key)).toEqual(["squat", "bench_press"]);
    expect(list[0]!.change).toBeCloseTo(10);
    expect(list[1]!.change).toBeCloseTo(-5);
    expect(list[0]!.trend).toHaveLength(3);
  });

  it("starts the index at 100 and ends at the average change", () => {
    const index = strengthIndex(data, from, today())!;
    expect(index.points[0]!.value).toBeCloseTo(100);
    // Squat +10 %, bench −5 % → +2.5 %.
    expect(index.change).toBeCloseTo(2.5);
    // In between, only the squat had moved (+5 %).
    expect(index.points.find((p) => p.date === addDays(today(), -20))!.value).toBeCloseTo(102.5);
  });

  it("has no index when nothing was trained in the period", () => {
    expect(strengthIndex(data, addDays(today(), -2), today())).toBeNull();
  });
});
