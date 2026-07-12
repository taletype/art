import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { GET, PATCH, POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthenticatedAppUser: vi.fn(),
}));

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockGetAuthenticatedAppUser = vi.mocked(getAuthenticatedAppUser);

function makePatchRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/artworks", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.test/api/artworks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawArtworkRequest(method: "PATCH" | "POST", body: string, headers?: HeadersInit) {
  return new NextRequest("https://example.test/api/artworks", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

afterEach(() => {
  globalThis.__realArtWorksRateLimitBuckets?.clear();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("artworks API write guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires the configured write bearer token before parsing POST bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await POST(makeRawArtworkRequest("POST", "{"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      message: "Missing bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer realm="realartworks"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid configured write bearer tokens before parsing POST bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await POST(
      makeRawArtworkRequest("POST", "{", { authorization: "Bearer wrong-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      message: "Invalid bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer error="invalid_token"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rate limits missing bearer token attempts for PATCH writes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-05T00:00:00.000Z"));
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");
    vi.stubEnv("API_RATE_LIMIT_MAX", "2");
    vi.stubEnv("API_RATE_LIMIT_WINDOW_MS", "1000");

    const body = {
      id: "artwork-id",
      sellerWallet: "0x1234567890abcdef1234567890abcdef12345678",
      status: "live",
    };

    const first = await PATCH(makePatchRequest(body));
    const second = await PATCH(makePatchRequest(body));
    const third = await PATCH(makePatchRequest(body));

    expect(first.status).toBe(401);
    expect(first.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(first.headers.get("X-RateLimit-Remaining")).toBe("1");

    expect(second.status).toBe(401);
    expect(second.headers.get("X-RateLimit-Remaining")).toBe("0");

    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBe("1");
    expect(third.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });
});

describe("artworks API GET", () => {
  const from = vi.fn();
  const select = vi.fn();
  const order = vi.fn();
  const eq = vi.fn();
  const limit = vi.fn();
  const single = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const query = { select, order, eq, limit, single };
    from.mockReturnValue(query);
    select.mockReturnValue(query);
    order.mockReturnValue(query);
    eq.mockReturnValue(query);
    limit.mockResolvedValue({ data: [{ id: "artwork-id" }], error: null });
    single.mockResolvedValue({ data: { id: "artwork-id" }, error: null });

    mockCreateSupabaseAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createSupabaseAdminClient>);
  });

  it("ignores blank detail ids and owner filters and returns the artwork list", async () => {
    const response = await GET(new NextRequest("https://example.test/api/artworks?id=%20%20%20&owner=%20%20%20&limit=2"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: "artwork-id" }]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(eq).not.toHaveBeenCalled();
    expect(single).not.toHaveBeenCalled();
    expect(limit).toHaveBeenCalledWith(2);
  });

  it("returns one artwork by id", async () => {
    const response = await GET(new NextRequest("https://example.test/api/artworks?id=artwork-id"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: "artwork-id" });
    expect(from).toHaveBeenCalledWith("artworks");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("id", "artwork-id");
    expect(single).toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
  });

  it("trims owner filters, clamps list limits, and ignores invalid seller wallet filters", async () => {
    const response = await GET(
      new NextRequest("https://example.test/api/artworks?owner=%20user-1%20&sellerWallet=not-an-address&limit=500"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: "artwork-id" }]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(eq).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("owner_user_id", "user-1");
    expect(limit).toHaveBeenCalledWith(100);
  });

  it("normalizes valid seller wallet filters", async () => {
    const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";
    const response = await GET(
      new NextRequest(`https://example.test/api/artworks?sellerWallet=%20${sellerWallet}%20&limit=10`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: "artwork-id" }]);
    expect(eq).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("seller_wallet", sellerWallet);
    expect(limit).toHaveBeenCalledWith(10);
  });
});

describe("artworks API POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedAppUser.mockResolvedValue(null);
  });

  it("returns validation errors without opening auth or admin clients", async () => {
    const response = await POST(makePostRequest({ title: "A" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Invalid artwork payload" });
    expect(body.issues.length).toBeGreaterThan(0);
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("returns bad request for malformed JSON without opening auth or admin clients", async () => {
    const response = await POST(makeRawArtworkRequest("POST", "{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON payload" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("creates a draft artwork for a valid wallet-backed request", async () => {
    const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";
    const from = vi.fn();
    const insert = vi.fn();
    const select = vi.fn();
    const single = vi.fn();
    const createdArtwork = { id: "artwork-id", seller_wallet: sellerWallet };
    const query = { insert, select, single };

    from.mockReturnValue(query);
    insert.mockReturnValue(query);
    select.mockReturnValue(query);
    single.mockResolvedValue({ data: createdArtwork, error: null });
    mockCreateSupabaseAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const response = await POST(
      makePostRequest({
        title: "Verified studio work",
        description: "A handmade work with provenance notes ready for review.",
        imageUrl: "https://example.test/artwork.png",
        medium: "digital painting",
        category: "visual",
        provenanceText: "Process notes and source artifact hashes.",
        priceEth: 0.05,
        sellerWallet,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(createdArtwork);
    expect(mockGetAuthenticatedAppUser).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("artworks");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Verified studio work",
        description: "A handmade work with provenance notes ready for review.",
        image_url: "https://example.test/artwork.png",
        medium: "digital painting",
        category: "visual",
        provenance_text: "Process notes and source artifact hashes.",
        owner_user_id: null,
        seller_wallet: sellerWallet,
        artist_wallet: sellerWallet,
        artist_name: sellerWallet,
        price_sol: 0.05,
        status: "draft",
        seller_flow_status: "draft",
      }),
    );
    expect(select).toHaveBeenCalledWith("*");
    expect(single).toHaveBeenCalledTimes(1);
  });
});

describe("artworks API PATCH", () => {
  const from = vi.fn();
  const update = vi.fn();
  const eq = vi.fn();
  const or = vi.fn();
  const select = vi.fn();
  const single = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const query = { update, eq, or, select };
    from.mockReturnValue(query);
    update.mockReturnValue(query);
    eq.mockReturnValue(query);
    or.mockReturnValue(query);
    select.mockReturnValue({ single });
    single.mockResolvedValue({ data: { id: "artwork-id" }, error: null });

    mockCreateSupabaseAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockGetAuthenticatedAppUser.mockResolvedValue(null);
  });

  it("returns bad request for malformed JSON without opening auth or admin clients", async () => {
    const response = await PATCH(makeRawArtworkRequest("PATCH", "{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON payload" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects non-object JSON payloads without opening auth or admin clients", async () => {
    const response = await PATCH(makeRawArtworkRequest("PATCH", "null"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid artwork payload" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects array JSON payloads without opening auth or admin clients", async () => {
    const response = await PATCH(makeRawArtworkRequest("PATCH", "[]"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid artwork payload" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects missing artwork ids without opening auth or admin clients", async () => {
    const response = await PATCH(makePatchRequest({ status: "live" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Artwork ID is required" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects blank artwork ids without opening auth or admin clients", async () => {
    const response = await PATCH(makePatchRequest({ id: "   ", status: "live" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Artwork ID is required" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects requests that only contain protected identity fields", async () => {
    const response = await PATCH(
      makePatchRequest({
        id: "artwork-id",
        sellerWallet: "0x1234567890abcdef1234567890abcdef12345678",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "No mutable artwork fields provided" });
    expect(mockGetAuthenticatedAppUser).not.toHaveBeenCalled();
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns not found when no artwork matches the actor", async () => {
    const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";
    single.mockResolvedValueOnce({ data: null, error: { code: "PGRST116", message: "No rows found" } });

    const response = await PATCH(
      makePatchRequest({
        id: "artwork-id",
        sellerWallet,
        status: "live",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Artwork not found" });
    expect(update).toHaveBeenCalledWith({ status: "live" });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "artwork-id");
    expect(eq).toHaveBeenNthCalledWith(2, "seller_wallet", sellerWallet);
  });

  it("uses normalized wallet identity fields for authorization without allowing clients to mutate them", async () => {
    const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";

    const response = await PATCH(
      makePatchRequest({
        id: " artwork-id ",
        owner_user_id: "other-user",
        sellerWallet: ` ${sellerWallet} `,
        artist_wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        status: "live",
        sync_status: "listing_confirmed",
        thirdweb_listing_id: "auction-7",
      }),
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      status: "live",
      sync_status: "listing_confirmed",
      thirdweb_listing_id: "auction-7",
    });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "artwork-id");
    expect(eq).toHaveBeenNthCalledWith(2, "seller_wallet", sellerWallet);
  });
});