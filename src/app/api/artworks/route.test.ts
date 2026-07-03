import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function makeRawArtworkRequest(method: "PATCH" | "POST", body: string) {
  return new NextRequest("https://example.test/api/artworks", {
    method,
    headers: { "content-type": "application/json" },
    body,
  });
}

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

  it("clamps list limits and ignores invalid seller wallet filters", async () => {
    const response = await GET(
      new NextRequest("https://example.test/api/artworks?owner=user-1&sellerWallet=not-an-address&limit=500"),
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
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("uses normalized wallet identity fields for authorization without allowing clients to mutate them", async () => {
    const sellerWallet = "0x1234567890abcdef1234567890abcdef12345678";

    const response = await PATCH(
      makePatchRequest({
        id: "artwork-id",
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
