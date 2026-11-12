import { describe, expect, it } from "vitest";
import { builtinExercises } from "./exercises";
import { tipsFor } from "./tips";

describe("technique tips", () => {
  it("has tips for common lifts", () => {
    expect(tipsFor("squat", "de")).toHaveLength(3);
    expect(tipsFor("jump_rope", "de")).toBeNull();
  });

  it("gives every EGYM machine its own movement tips, not machine setup", () => {
    const egym = builtinExercises.filter((e) => e.equipment === "egym");
    expect(egym.length).toBeGreaterThan(0);
    for (const e of egym) {
      for (const lang of ["de", "en"] as const) {
        const list = tipsFor(e.key, lang);
        expect(list, `${e.key} ${lang}`).toHaveLength(3);
        expect(list!.join(" ")).not.toMatch(/anmelden|log in|automatisch|sets seat/i);
      }
    }
    expect(tipsFor("egym_adductor", "de")).not.toEqual(tipsFor("egym_abductor", "de"));
  });
});
