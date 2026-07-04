import { describe, expect, it } from "vitest";
import { isValidEvmAddress } from "@/lib/evmAddress";

describe("isValidEvmAddress", () => {
  it("accepts 40-character hexadecimal addresses with a 0x prefix", () => {
    expect(isValidEvmAddress("0x0000000000000000000000000000000000000000")).toBe(true);
    expect(isValidEvmAddress("0xA1b2C3d4E5f60718293a4B5c6D7e8F9012345678")).toBe(true);
  });

  it("trims surrounding whitespace before validation", () => {
    expect(isValidEvmAddress("  0x0000000000000000000000000000000000000000\n")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEvmAddress("0000000000000000000000000000000000000000")).toBe(false);
    expect(isValidEvmAddress("0x000000000000000000000000000000000000000")).toBe(false);
    expect(isValidEvmAddress("0x00000000000000000000000000000000000000000")).toBe(false);
    expect(isValidEvmAddress("0x000000000000000000000000000000000000000g")).toBe(false);
    expect(isValidEvmAddress("")).toBe(false);
  });
});
