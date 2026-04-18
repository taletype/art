import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "../../../lib/apiGuards";
import { prepareListingPayload } from "../../../lib/auctionHouse";
import { canListAsset, getListingGateFailureReason, validateProvenance } from "../../../lib/provenance";
import { listRequestSchema } from "../../../types/art";

export async function POST(request: Request) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "list-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const body = (await request.json()) as { listing: unknown; provenance: unknown };
    const listing = listRequestSchema.parse(body.listing);
    const provenance = validateProvenance(body.provenance);

    const gateError = getListingGateFailureReason(provenance);
    if (gateError || !canListAsset(provenance) || listing.provenanceStatus !== "VERIFIED_HUMAN") {
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            message: gateError ?? "Listing blocked by HUMAN_ policy",
          },
          { status: 403 },
        ),
        rateLimit,
      );
    }

    const preparedListing = await prepareListingPayload(listing);

    if (preparedListing.blockingErrors.length > 0) {
      return applyRateLimitHeaders(
        NextResponse.json(
          {
            ok: false,
            message: "Listing preparation blocked by missing Auction House config",
            listing: preparedListing,
          },
          { status: 422 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(NextResponse.json({ ok: true, listing: preparedListing }), rateLimit);
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid listing payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          message: error instanceof Error ? error.message : "Unknown listing error",
        },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
