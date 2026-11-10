import { describe, expect, it } from "vitest";
import { dayToInput, parseDayInput } from "./dates";

describe("date input", () => {
  it("parses German and English input", () => {
    expect(parseDayInput("10.11.2026", "de")).toBe("2026-11-10");
    expect(parseDayInput("3.2.26", "de")).toBe("2026-02-03");
    expect(parseDayInput("10.11.", "de", "2025-12-01")).toBe("2025-11-10");
    expect(parseDayInput("11/10/2026", "en")).toBe("2026-11-10");
    expect(parseDayInput("2026-11-10", "de")).toBe("2026-11-10");
  });

  it("rejects impossible dates and garbage", () => {
    expect(parseDayInput("31.02.2026", "de")).toBeNull();
    expect(parseDayInput("morgen", "de")).toBeNull();
    expect(parseDayInput("11/10/2026", "de")).toBeNull();
  });

  it("formats for the input in the app's language", () => {
    expect(dayToInput("2026-11-03", "de")).toBe("03.11.2026");
    expect(dayToInput("2026-11-03", "en")).toBe("11/03/2026");
  });
});
