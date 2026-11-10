import { describe, expect, it } from "vitest";
import { tipsFor } from "./tips";

describe("technique tips", () => {
  it("has tips for common lifts and a generic one for EGYM", () => {
    expect(tipsFor("squat", "de")).toHaveLength(3);
    expect(tipsFor("egym_chest_press", "en")?.[0]).toContain("machine");
    expect(tipsFor("jump_rope", "de")).toBeNull();
  });
});
