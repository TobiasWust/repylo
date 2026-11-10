import { describe, expect, it } from "vitest";
import { calculatePlates } from "./plates";

describe("plates", () => {
  it("loads plates per side, heaviest first", () => {
    expect(calculatePlates(100, 20, "kg").perSide).toEqual([25, 15]);
    expect(calculatePlates(62.5, 20, "kg").perSide).toEqual([20, 1.25]);
    expect(calculatePlates(225, 45, "lb").perSide).toEqual([45, 45]);
  });

  it("reports what can't be loaded exactly", () => {
    expect(calculatePlates(21, 20, "kg").remainder).toBe(0.5);
  });
});
