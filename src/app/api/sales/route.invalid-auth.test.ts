import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PATCH, POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase-db", () => ({
  getSaleById: vi.fn(),
  listSales: vi.fn(),
}));

const mockCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient);

function makeRawSalesRequest(method: "PATCH" | "POST", body: string, headers?: HeadersInit) {
  return new NextRequest("https://example.test/api/sales", {
    method,
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

afterEach(() => {
  globalThis.__realArtWorksRateLimitBuckets?.clear();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("sales API bearer auth", () => {
  it("rejects invalid configured write bearer tokens before parsing POST bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await POST(
      makeRawSalesRequest("POST", "{", { authorization: "Bearer wrong-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      message: "Invalid bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer error="invalid_token"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid configured write bearer tokens before parsing PATCH bodies", async () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");

    const response = await PATCH(
      makeRawSalesRequest("PATCH", "{", { authorization: "Bearer wrong-token" }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      ok: false,
      message: "Invalid bearer token for protected route (API_WRITE_BEARER_TOKEN)",
    });
    expect(response.headers.get("WWW-Authenticate")).toBe('Bearer error="invalid_token"');
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(mockCreateSupabaseAdminClient).not.toHaveBeenCalled();
  });
});
