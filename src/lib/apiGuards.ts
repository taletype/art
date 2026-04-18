import { NextResponse } from "next/server";

const RATE_LIMIT_BUCKETS = new Map<string, { count: number; resetAt: number }>();

declare global {
  // eslint-disable-next-line no-var
  var __realArtWorksRateLimitBuckets: typeof RATE_LIMIT_BUCKETS | undefined;
}

const buckets = globalThis.__realArtWorksRateLimitBuckets ?? RATE_LIMIT_BUCKETS;
if (!globalThis.__realArtWorksRateLimitBuckets) {
  globalThis.__realArtWorksRateLimitBuckets = buckets;
}

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? "unknown";
}

export function optionalBearerAuth(request: Request, envVarName: string) {
  const configured = process.env[envVarName];
  if (!configured) {
    return null;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        ok: false,
        message: `Missing bearer token for protected route (${envVarName})`,
      },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="realartworks"' },
      },
    );
  }

  const token = header.slice("Bearer ".length).trim();
  if (token !== configured) {
    return NextResponse.json(
      { ok: false, message: `Invalid bearer token for protected route (${envVarName})` },
      {
        status: 403,
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
      },
    );
  }

  return null;
}

export function applyRateLimitHeaders(
  response: NextResponse,
  detail: { limit: number; remaining: number; resetAt: number },
) {
  response.headers.set("X-RateLimit-Limit", String(detail.limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, detail.remaining)));
  response.headers.set("X-RateLimit-Reset", String(Math.floor(detail.resetAt / 1000)));
  return response;
}

export function enforceRouteRateLimit(
  request: Request,
  scope: string,
  options?: { max?: number; windowMs?: number },
) {
  const max = options?.max ?? readPositiveInt(process.env.API_RATE_LIMIT_MAX, 30);
  const windowMs = options?.windowMs ?? readPositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 60_000);
  const ip = getRequestIp(request);
  const bucketKey = `${scope}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const created = { count: 1, resetAt: now + windowMs };
    buckets.set(bucketKey, created);
    return { ok: true as const, limit: max, remaining: max - 1, resetAt: created.resetAt };
  }

  if (existing.count >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    const response = NextResponse.json(
      {
        ok: false,
        message: `Rate limit exceeded for ${scope}. Retry after ${retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );

    applyRateLimitHeaders(response, { limit: max, remaining: 0, resetAt: existing.resetAt });
    return { ok: false as const, response };
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return { ok: true as const, limit: max, remaining: max - existing.count, resetAt: existing.resetAt };
}
