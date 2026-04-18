import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { prepareAuctionBid } from "@/lib/auctionMarketplace";
import { auctionBidPrepareRequestSchema } from "@/types/art";

export async function POST(request: Request) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "auction-bid-post", {
    max: Number(process.env.API_AUCTION_BID_RATE_LIMIT_MAX || 20),
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const payload = auctionBidPrepareRequestSchema.parse(await request.json());
    const bid = await prepareAuctionBid(payload);

    return applyRateLimitHeaders(
      NextResponse.json({
        ok: bid.status === "TX_PREPARED",
        bid,
      }),
      rateLimit,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid auction bid payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          message: error instanceof Error ? error.message : "Unknown auction bid error",
        },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
