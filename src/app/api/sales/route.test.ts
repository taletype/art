import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSales } from "@/lib/supabase-db";
import { GET, PATCH, POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase-db", () => ({
  getSaleById: vi.fn(),
  listSales: vi.fn(),
}));

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);
const mockListSales = vi.mocked(listSales);

function makeSalesRequest(method: "PATCH" | "POST", body: Record<string, unknown>, headers?: HeadersInit) {
  return makeRawSalesRequest(method, JSON.stringify(body), headers);
}

function makeRawSalesRequest(method: "PATCH" | "POST", body: string, headers?: HeadersInit) {
  return new NextRequest("https://example.test/api/sales", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("sales API GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSales.mockResolvedValue([{ id: "sale-id" }]);
  });

  it("defaults missing, invalid, and non-positive list limits", async () => {
    const missing = await GET(new NextRequest("https://example.test/api/sales"));
    expect(await missing.json()).toEqual([{ id: "sale-id" }]);
    expect(mockListSales).toHaveBeenLastCalledWith(20);

    await GET(new NextRequest("https://example.test/api/sales?limit=not-a-number"));
    expect(mockListSales).toHaveBeenLastCalledWith(20);

    await GET(new NextRequest("https://example.test/api/sales?limit=-5"));
    expect(mockListSales).toHaveBeenLastCalledWith(20);
  });

  it("floors decimal list limits and clamps oversized values", async () => {
    await GET(new NextRequest("https://example.test/api/sales?limit=3.9"));
    expect(mockListSales).toHaveBeenLastCalledWith(3);

    await GET(new NextRequest("https://example.test/api/sales?limit=500"));
    expect(mockListSales).toHaveBeenLastCalledWith(100);
  });
});

describe("sales API write guards", () => {
  const from = vi.fn();
  const insert = vi.fn();
  const update = vi.fn();
  const eq = vi.fn();
  const select = vi.fn();
  const single = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const query = { insert, update, eq, select, single };
    from.mockReturnValue(query);
    insert.mockReturnValue(query);
    update.mockReturnValue(query);
    eq.mockReturnValue(query);
    select.mockReturnValue(query);
    single.mockResolvedValue({ data: { id: "sale-id" }, error: null });

    mockCreateSupabaseAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createSupabaseAdminClient>);
  });

  afterEach(() => {
    globalThis.__realArtWorksRateLimitBuckets?.clear();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("requires the configured write bearer token before parsing POST bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await POST(makeRawSalesRequest("POST", "{"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      message: "Missing bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer realm="realartworks"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rate limits missing bearer token attempts for PATCH writes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-06T00:00:00.000Z"));
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");
    vi.stubEnv("API_RATE_LIMIT_MAX", "2");
    vi.stubEnv("API_RATE_LIMIT_WINDOW_MS", "1000");

    const body = { id: "sale-id", title: "Updated sale" };
    const first = await PATCH(makeSalesRequest("PATCH", body));
    const second = await PATCH(makeSalesRequest("PATCH", body));
    const third = await PATCH(makeSalesRequest("PATCH", body));

    expect(first.status).toBe(401);
    expect(first.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(first.headers.get("X-RateLimit-Remaining")).toBe("1");

    expect(second.status).toBe(401);
    expect(second.headers.get("X-RateLimit-Remaining")).toBe("0");

    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBe("1");
    expect(third.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("returns bad request for malformed JSON without opening the admin client", async () => {
    const response = await POST(makeRawSalesRequest("POST", "{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON payload" });
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects non-object PATCH payloads without opening the admin client", async () => {
    const response = await PATCH(makeRawSalesRequest("PATCH", "null"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid sale payload" });
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("updates a sale when write guards allow the request", async () => {
    const response = await PATCH(makeSalesRequest("PATCH", { id: "sale-id", title: "Updated sale" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: "sale-id" });
    expect(from).toHaveBeenCalledWith("auction_sales");
    expect(update).toHaveBeenCalledWith({ title: "Updated sale" });
    expect(eq).toHaveBeenCalledWith("id", "sale-id");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
  });
});
