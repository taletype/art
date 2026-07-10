import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { createSellerArtwork } from "@/lib/seller";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedAppUser: vi.fn(),
}));

vi.mock("@/lib/seller", () => ({
  createSellerArtwork: vi.fn(),
}));

const mockGetAuthenticatedAppUser = vi.mocked(getAuthenticatedAppUser);
const mockCreateSellerArtwork = vi.mocked(createSellerArtwork);
const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";

function makeMintRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/mint", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawMintRequest(body: string, headers?: HeadersInit) {
  return new NextRequest("https://example.test/api/mint", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("mint API POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedAppUser.mockResolvedValue(null);
    mockCreateSellerArtwork.mockResolvedValue({ id: "artwork-id" });
  });

  afterEach(() => {
    globalThis.__realArtWorksRateLimitBuckets?.clear();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("requires the configured write bearer token before parsing POST bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await POST(makeRawMintRequest("{"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      message: "Missing bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer realm="realartworks"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("rejects invalid configured write bearer tokens before parsing POST bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await POST(makeRawMintRequest("{", { authorization: "Bearer wrong-token" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      message: "Invalid bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer error="invalid_token"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("rate limits missing bearer token attempts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-07T00:00:00.000Z"));
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");
    vi.stubEnv("API_RATE_LIMIT_MAX", "2");
    vi.stubEnv("API_RATE_LIMIT_WINDOW_MS", "1000");

    const first = await POST(makeRawMintRequest("{"));
    const second = await POST(makeRawMintRequest("{"));
    const third = await POST(makeRawMintRequest("{"));

    expect(first.status).toBe(401);
    expect(first.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(first.headers.get("X-RateLimit-Remaining")).toBe("1");

    expect(second.status).toBe(401);
    expect(second.headers.get("X-RateLimit-Remaining")).toBe("0");

    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBe("1");
    expect(third.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("returns bad request for malformed JSON without opening auth or seller clients", async () => {
    const response = await POST(makeRawMintRequest("{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, message: "Invalid JSON payload" });
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("returns validation errors without opening auth or seller clients", async () => {
    const response = await POST(makeMintRequest({ title: "A" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, message: "Invalid seller payload" });
    expect(body.issues.length).toBeGreaterThan(0);
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSellerArtwork).not.toHaveBeenCalled();
  });

  it("creates a draft artwork for a valid wallet-backed request", async () => {
    const response = await POST(
      makeMintRequest({
        title: "Verified studio work",
        description: "A handmade work with provenance notes ready for review.",
        imageUrl: "https://example.test/artwork.png",
        sellerWallet,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ ok: true, artwork: { id: "artwork-id" } });
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockGetAuthenticatedAppUser).toHaveBeenCalledTimes(1);
    expect(mockCreateSellerArtwork).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: null,
        sellerWallet,
        title: "Verified studio work",
        imageUrl: "https://example.test/artwork.png",
      }),
    );
  });
});
