import { describe, expect, it } from "vitest";
import { createAppOwner, type OwnerSecret } from "@evolu/common";
import { parseMnemonic } from "./owner";

describe("connect link", () => {
  const words = createAppOwner(new Uint8Array(32).fill(7) as unknown as OwnerSecret).mnemonic;

  it("reads the phrase from a scanned link, plain words or messy input", () => {
    expect(parseMnemonic(`https://repylo.example/#connect=${words.split(" ").join("-")}`)).toBe(words);
    expect(parseMnemonic(`  ${words.toUpperCase().split(" ").join("\n")} `)).toBe(words);
    expect(parseMnemonic("https://repylo.example/#connect=not-a-phrase")).toBeNull();
  });
});
