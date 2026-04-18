import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "../../../lib/apiGuards";
import { prepareMintIntent } from "../../../lib/metaplexCore";
import { requiresMoreEvidence } from "../../../lib/provenance";
import { mintRequestSchema } from "../../../types/art";

export async function POST(request: Request) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "mint-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = mintRequestSchema.parse(await request.json());
    const evidenceCheck = requiresMoreEvidence(parsed.provenance);
    const prepared = await prepareMintIntent(parsed);

    return applyRateLimitHeaders(
      NextResponse.json({
        ok: prepared.blockingErrors.length === 0,
        ...prepared,
        evidenceRequirements: evidenceCheck,
      }),
      rateLimit,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid mint request", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          message: error instanceof Error ? error.message : "Unknown mint preparation error",
        },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
