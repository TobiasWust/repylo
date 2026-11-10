import { describe, expect, it } from "vitest";
import { rate } from "./standards";

describe("strength standards", () => {
  it("places a lift on the level scale", () => {
    const r = rate("bench_press", 1.2, "male")!;
    expect(r.level).toBe("intermediate");
    expect(r.nextRatio).toBe(1.5);
    expect(r.progress).toBeCloseTo(0.4);
    expect(rate("bench_press", 1.2, "female")!.level).toBe("advanced");
    expect(rate("leg_press", 3, "male")).toBeNull();
  });
});
