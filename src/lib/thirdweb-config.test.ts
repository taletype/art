import { afterEach, describe, expect, it, vi } from "vitest";
import { getListingRouteId, getMarketplaceChain, getMarketplaceChainLabel, parseListingRouteId } from "@/lib/thirdweb-config";
import { isValidEvmAddress } from "@/lib/evmAddress";

describe("evmAddress", () => {
  it("accepts valid EVM addresses", () => {
    expect(isValidEvmAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(true);
  });

  it("rejects invalid EVM addresses", () => {
    expect(isValidEvmAddress("So11111111111111111111111111111111111111112")).toBe(false);
    expect(isValidEvmAddress("0x1234")).toBe(false);
  });
});

describe("thirdweb-config route ids", () => {
  it("builds and parses marketplace route ids", () => {
    const routeId = getListingRouteId("auction", 42n);
    expect(routeId).toBe("auction-42");
    expect(parseListingRouteId(routeId)).toEqual({ kind: "auction", id: 42n });
  });

  it("returns null for malformed route ids", () => {
    expect(parseListingRouteId("bad-value")).toBeNull();
    expect(parseListingRouteId("auction-nope")).toBeNull();
  });
});

describe("thirdweb-config Base Sepolia chain", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to Base Sepolia", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "");

    expect(getMarketplaceChain().id).toBe(84532);
    expect(getMarketplaceChainLabel()).toBe("Base Sepolia");
  });

  it("uses Base mainnet only when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "base");

    expect(getMarketplaceChain().id).toBe(8453);
    expect(getMarketplaceChainLabel()).toBe("Base");
  });
});
