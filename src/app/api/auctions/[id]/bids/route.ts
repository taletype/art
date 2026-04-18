import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { placeOffchainBid } from "@/lib/offchainAuctions";
import { placeBidRequestSchema } from "@/types/offchainAuction";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "auctions-bids-post", {
    max: Number(process.env.API_AUCTION_BID_RATE_LIMIT_MAX || 20),
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const { id } = await params;
    const payload = placeBidRequestSchema.parse(await request.json());
    const bid = await placeOffchainBid(id, payload);

    return applyRateLimitHeaders(NextResponse.json({ ok: true, bid }, { status: 201 }), rateLimit);
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid bid payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Failed to place bid" },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
