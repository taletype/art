import { afterEach, describe, expect, it, vi } from "vitest";
import { enforceRouteRateLimit, getRequestIp, optionalBearerAuth } from "@/lib/apiGuards";

function makeRequest(headers?: HeadersInit) {
  return new Request("https://example.test/api", { headers });
}

describe("apiGuards request IP resolution", () => {
  it("uses the first x-forwarded-for address", () => {
    const request = makeRequest({ "x-forwarded-for": "203.0.113.10, 198.51.100.20" });

    expect(getRequestIp(request)).toBe("203.0.113.10");
  });

  it("skips empty x-forwarded-for entries", () => {
    const request = makeRequest({ "x-forwarded-for": " , 203.0.113.10, 198.51.100.20" });

    expect(getRequestIp(request)).toBe("203.0.113.10");
  });

  it("falls back when x-forwarded-for has no address", () => {
    const request = makeRequest({ "x-forwarded-for": " , ", "cf-connecting-ip": "203.0.113.30" });

    expect(getRequestIp(request)).toBe("203.0.113.30");
  });

  it("falls back through proxy headers before unknown", () => {
    expect(getRequestIp(makeRequest({ "cf-connecting-ip": "203.0.113.30" }))).toBe("203.0.113.30");
    expect(getRequestIp(makeRequest({ "x-real-ip": "203.0.113.40" }))).toBe("203.0.113.40");
    expect(getRequestIp(makeRequest())).toBe("unknown");
  });
});

describe("apiGuards optionalBearerAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not require auth when the route token is unconfigured", () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "");

    expect(optionalBearerAuth(makeRequest(), "API_WRITE_BEARER_TOKEN")).toBeNull();
  });

  it("does not require auth when the route token is whitespace only", () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "   ");

    expect(optionalBearerAuth(makeRequest(), "API_WRITE_BEARER_TOKEN")).toBeNull();
  });

  it("accepts the configured bearer token", () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "test-token");

    expect(
      optionalBearerAuth(makeRequest({ authorization: "Bearer test-token" }), "API_WRITE_BEARER_TOKEN"),
    ).toBeNull();
  });

  it("accepts the bearer auth scheme case-insensitively", () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "test-token");

    expect(
      optionalBearerAuth(makeRequest({ authorization: "bearer   test-token" }), "API_WRITE_BEARER_TOKEN"),
    ).toBeNull();
  });

  it("trims the configured bearer token", () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", " test-token ");

    expect(
      optionalBearerAuth(makeRequest({ authorization: "Bearer test-token" }), "API_WRITE_BEARER_TOKEN"),
    ).toBeNull();
  });

  it("rejects missing and invalid bearer tokens", () => {
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "test-token");

    const missing = optionalBearerAuth(makeRequest(), "API_WRITE_BEARER_TOKEN");
    const invalid = optionalBearerAuth(
      makeRequest({ authorization: "Bearer wrong-token" }),
      "API_WRITE_BEARER_TOKEN",
    );

    expect(missing?.status).toBe(401);
    expect(missing?.headers.get("WWW-Authenticate")).toBe('Bearer realm="realartworks"');
    expect(invalid?.status).toBe(403);
    expect(invalid?.headers.get("WWW-Authenticate")).toBe('Bearer error="invalid_token"');
  });
});

describe("apiGuards route rate limiting", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests until the bucket is exhausted, then resets after the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const scope = `test-scope-${Math.random()}`;
    const request = makeRequest({ "x-forwarded-for": "203.0.113.50" });

    const first = enforceRouteRateLimit(request, scope, { max: 2, windowMs: 1000 });
    const second = enforceRouteRateLimit(request, scope, { max: 2, windowMs: 1000 });
    const third = enforceRouteRateLimit(request, scope, { max: 2, windowMs: 1000 });

    expect(first).toMatchObject({ ok: true, limit: 2, remaining: 1 });
    expect(second).toMatchObject({ ok: true, limit: 2, remaining: 0 });
    expect(third.ok).toBe(false);

    if (!third.ok) {
      expect(third.response.status).toBe(429);
      expect(third.response.headers.get("Retry-After")).toBe("1");
      expect(third.response.headers.get("X-RateLimit-Limit")).toBe("2");
      expect(third.response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(third.response.headers.get("X-RateLimit-Reset")).toBe("1767225601");
    }

    vi.advanceTimersByTime(1001);

    expect(enforceRouteRateLimit(request, scope, { max: 2, windowMs: 1000 })).toMatchObject({
      ok: true,
      limit: 2,
      remaining: 1,
    });
  });
});
