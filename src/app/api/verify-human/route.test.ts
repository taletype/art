import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const validPayload = {
  provenance: {
    category: "visual",
    medium: "digital painting",
    evidence: [
      {
        kind: "source_file",
        label: "Source file hash",
        hash: "a".repeat(64),
      },
    ],
  },
};

function makePostRequest(headers?: HeadersInit) {
  return new Request("https://example.test/api/verify-human", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(validPayload),
  });
}

function makeRawPostRequest(body: string) {
  return new Request("https://example.test/api/verify-human", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("verify-human API route guards", () => {
  afterEach(() => {
    globalThis.__realArtWorksRateLimitBuckets?.clear();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("returns bad request for malformed JSON", async () => {
    const response = await POST(makeRawPostRequest("{"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, message: "Invalid JSON payload" });
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
  });

  it("rate limits missing bearer token attempts when write auth is configured", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-04T00:00:00.000Z"));
    vi.stubEnv("API_WRITE_BEARER_TOKEN", "secret-token");
    vi.stubEnv("API_RATE_LIMIT_MAX", "2");
    vi.stubEnv("API_RATE_LIMIT_WINDOW_MS", "1000");

    const first = await POST(makePostRequest());
    const second = await POST(makePostRequest());
    const third = await POST(makePostRequest());

    expect(first.status).toBe(401);
    expect(first.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(first.headers.get("X-RateLimit-Remaining")).toBe("1");

    expect(second.status).toBe(401);
    expect(second.headers.get("X-RateLimit-Remaining")).toBe("0");

    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBe("1");
    expect(third.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
