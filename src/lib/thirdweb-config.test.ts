import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getListingRouteId,
  getMarketplaceChain,
  getMarketplaceChainConfigLabel,
  getMarketplaceChainLabel,
  getMarketplaceContract,
  getMarketplaceExplorerUrl,
  getNftCollectionContract,
  isMarketplaceChainConfigured,
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
    const auctionRouteId = getListingRouteId("auction", 42n);
    const directRouteId = getListingRouteId("direct", "99");

    expect(auctionRouteId).toBe("auction-42");
    expect(parseListingRouteId(auctionRouteId)).toEqual({ kind: "auction", id: 42n });
    expect(directRouteId).toBe("direct-99");
    expect(parseListingRouteId(directRouteId)).toEqual({ kind: "direct", id: 99n });
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
    expect(getMarketplaceChainConfigLabel()).toBe("Base Sepolia (default)");
    expect(isMarketplaceChainConfigured()).toBe(true);
  });

  it("accepts the documented Base Sepolia chain value", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "base-sepolia");

    expect(getMarketplaceChain().id).toBe(84532);
    expect(getMarketplaceChainLabel()).toBe("Base Sepolia");
    expect(isMarketplaceChainConfigured()).toBe(true);
  });

  it("accepts the Base Sepolia chain id", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "84532");

    expect(getMarketplaceChain().id).toBe(84532);
    expect(getMarketplaceChainLabel()).toBe("Base Sepolia");
    expect(isMarketplaceChainConfigured()).toBe(true);
  });

  it("uses the Base Sepolia explorer by default", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "");

    expect(getMarketplaceExplorerUrl("address", "0x123")).toBe("https://sepolia.basescan.org/address/0x123");
  });

  it("uses Base mainnet only when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "base");

    expect(getMarketplaceChain().id).toBe(8453);
    expect(getMarketplaceChainLabel()).toBe("Base");
    expect(isMarketplaceChainConfigured()).toBe(true);
  });

  it("accepts the Base mainnet chain id", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "8453");

    expect(getMarketplaceChain().id).toBe(8453);
    expect(getMarketplaceChainLabel()).toBe("Base");
    expect(isMarketplaceChainConfigured()).toBe(true);
  });

  it("uses the Base mainnet explorer when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "8453");

    expect(getMarketplaceExplorerUrl("tx", "0xabc")).toBe("https://basescan.org/tx/0xabc");
  });

  it("reports unsupported chain env values without changing the runtime fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "ethereum");

    expect(getMarketplaceChain().id).toBe(84532);
    expect(getMarketplaceChainLabel()).toBe("Base Sepolia");
    expect(getMarketplaceChainConfigLabel()).toBe("ethereum");
    expect(isMarketplaceChainConfigured()).toBe(false);
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

  it("does not treat invalid marketplace contract addresses as marketplace-ready", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT", "0x1234");

    expect(isMarketplaceConfigured()).toBe(false);
  });

  it("detects marketplace readiness when client and contract env vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isMarketplaceConfigured()).toBe(true);
  });

  it("does not treat valid contracts as ready when the chain env is unsupported", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "ethereum");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isMarketplaceConfigured()).toBe(false);
    expect(isNftCollectionConfigured()).toBe(false);
  });

  it("refuses to create contracts when the chain env is unsupported", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CHAIN", "ethereum");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(() => getMarketplaceContract()).toThrow("NEXT_PUBLIC_THIRDWEB_CHAIN must be");
    expect(() => getNftCollectionContract()).toThrow("NEXT_PUBLIC_THIRDWEB_CHAIN must be");
  });

  it("does not treat the NFT collection as ready without a real client id", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "your_thirdweb_client_id");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isNftCollectionConfigured()).toBe(false);
  });

  it("does not treat invalid NFT collection addresses as collection-ready", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234");

    expect(isNftCollectionConfigured()).toBe(false);
  });

  it("detects NFT collection readiness when client and contract env vars are present", () => {
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_CLIENT_ID", "test-thirdweb-client");
    vi.stubEnv("NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT", "0x1234567890abcdef1234567890abcdef12345678");

    expect(isNftCollectionConfigured()).toBe(true);
  });
});
