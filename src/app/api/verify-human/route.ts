import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import {
  getProvenanceBadgeState,
  requiresMoreEvidence,
  validateProvenance,
  verifyProvenancePayloadSchema,
} from "@/lib/provenance";

export async function POST(request: Request) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "verify-human-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const parsed = verifyProvenancePayloadSchema.parse(await request.json());
    const provenance = validateProvenance(parsed.provenance);
    const evidenceCheck = requiresMoreEvidence(provenance);
    const mockReviewEnabled = process.env.NEXT_PUBLIC_ENABLE_MOCK_REVIEW === "true";

    if (parsed.forceStatus && !mockReviewEnabled) {
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            message: "forceStatus is only available when mock review mode is enabled.",
          },
          { status: 403 },
        ),
        rateLimit,
      );
    }

    const verificationStatus = mockReviewEnabled
      ? parsed.forceStatus ?? provenance.verificationStatus
      : provenance.verificationStatus;

    return applyRateLimitHeaders(
      NextResponse.json({
        ok: true,
        verificationStatus,
        badgeState: getProvenanceBadgeState(provenance),
        evidenceCheck,
      }),
      rateLimit,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid provenance payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          message: error instanceof Error ? error.message : "Unknown verification error",
        },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
