import { describe, expect, it } from "vitest";
import { alternatives } from "./alternatives";
import { build } from "../test/fixtures";

describe("exercise alternatives", () => {
  const keys = (key: string, exclude?: ReadonlySet<string>) => alternatives(build([]), key, exclude).map((e) => e.key);

  it("offers exercises for the same main muscles, closest first", () => {
    const list = keys("egym_adductor");
    expect(list[0]).toBe("hip_adduction");
    expect(list).toContain("copenhagen_plank");
    expect(list).not.toContain("bench_press");
  });

  it("puts listed variants and same-movement exercises near the top", () => {
    const list = keys("lat_pulldown").slice(0, 5);
    expect(list).toContain("pull_up");
    expect(list).toContain("egym_lat_pulldown");
  });

  it("keeps cardio with cardio and skips excluded exercises", () => {
    const list = keys("bike", new Set(["rowing_machine"]));
    expect(list.length).toBeGreaterThan(0);
    expect(list).not.toContain("rowing_machine");
    expect(list).not.toContain("squat");
  });
});
