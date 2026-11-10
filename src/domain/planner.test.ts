import { describe, expect, it } from "vitest";
import { getExercise } from "./model";
import { generateCircuit, generatePlan } from "./planner";
import { egymCircuit } from "./exercises";
import { build } from "../test/fixtures";

describe("plan assistant", () => {
  const data = build([]);
  it("builds the right split for the number of days", () => {
    expect(generatePlan(data, 2, "gym", "hypertrophy", "de").map((p) => p.name)).toEqual(["Ganzkörper A", "Ganzkörper B"]);
    expect(generatePlan(data, 4, "gym", "hypertrophy", "de").map((p) => p.name)).toEqual(["Oberkörper A", "Unterkörper A", "Oberkörper B", "Unterkörper B"]);
    expect(generatePlan(data, 6, "home", "strength", "en")).toHaveLength(6);
  });

  it("only uses exercises available at the chosen place, without duplicates", () => {
    for (const plan of generatePlan(data, 3, "egym", "endurance", "de")) {
      const keys = plan.items.map((i) => i.exerciseKey);
      expect(keys.every((k) => k.startsWith("egym_"))).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
      expect(plan.items[0]!.sets[0]!.reps).toBe(20);
    }
  });
});

describe("circuit plans", () => {
  const data = build([]);
  it("builds a full-body circuit for every place", () => {
    const gym = generateCircuit(data, "gym", "hypertrophy", "de");
    expect(gym.name).toBe("Zirkeltraining");
    expect(gym.items.length).toBeGreaterThanOrEqual(10);
    expect(gym.items[0]!.sets[0]!.reps).toBe(15);
    expect(generateCircuit(data, "home", "hypertrophy", "de").items.every((i) => !getExercise(data, i.exerciseKey).equipment.match(/machine|cable|egym/))).toBe(true);
    const egym = generateCircuit(data, "egym", "hypertrophy", "en");
    expect(egym.items.map((i) => i.exerciseKey)).toEqual(egymCircuit);
    expect(egym.items[0]!.sets[0]!.reps).toBe(20);
  });
});
