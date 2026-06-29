import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getListingRouteId,
  getMarketplaceChain,
  getMarketplaceChainLabel,
  getMarketplaceExplorerUrl,
  isMarketplaceConfigured,
  isNftCollectionConfigured,
  parseListingRouteId,
} from "@/lib/thirdweb-config";
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
    expect(parseListingRouteId("auction-42-extra")).toBeNull();
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

  it("accepts the documented Base Sepolia chain value", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "base-sepolia");

    expect(getMarketplaceChain().id).toBe(84532);
    expect(getMarketplaceChainLabel()).toBe("Base Sepolia");
  });

  it("accepts the Base Sepolia chain id", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "84532");

    expect(getMarketplaceChain().id).toBe(84532);
    expect(getMarketplaceChainLabel()).toBe("Base Sepolia");
  });

  it("uses the Base Sepolia explorer by default", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "");

    expect(getMarketplaceExplorerUrl("address", "0x123")).toBe("https://sepolia.basescan.org/address/0x123");
  });

  it("uses Base mainnet only when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "base");

    expect(getMarketplaceChain().id).toBe(8453);
    expect(getMarketplaceChainLabel()).toBe("Base");
  });

  it("accepts the Base mainnet chain id", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "8453");

    expect(getMarketplaceChain().id).toBe(8453);
    expect(getMarketplaceChainLabel()).toBe("Base");
  });

  it("uses the Base mainnet explorer when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "8453");

    expect(getMarketplaceExplorerUrl("tx", "0xabc")).toBe("https://basescan.org/tx/0xabc");
  });
});

describe("thirdweb-config marketplace readiness", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not treat .env.example placeholders as marketplace-ready", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "your_thirdweb_client_id");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isMarketplaceConfigured()).toBe(false);
  });

  it("detects marketplace readiness when client and contract env vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isMarketplaceConfigured()).toBe(true);
  });

  it("does not treat the NFT collection as ready without a real client id", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "your_thirdweb_client_id");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isNftCollectionConfigured()).toBe(false);
  });

  it("detects NFT collection readiness when client and contract env vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isNftCollectionConfigured()).toBe(true);
  });
});