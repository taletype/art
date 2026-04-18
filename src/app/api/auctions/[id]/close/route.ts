import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { closeOffchainAuction } from "@/lib/offchainAuctions";
import { closeAuctionRequestSchema } from "@/types/offchainAuction";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "auctions-close-post", {
    max: Number(process.env.API_AUCTIONS_RATE_LIMIT_MAX || 30),
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const { id } = await params;
    const payload = closeAuctionRequestSchema.parse(await request.json());
    const result = await closeOffchainAuction(id, payload.closedBy);

    return applyRateLimitHeaders(NextResponse.json({ ok: true, ...result }), rateLimit);
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid close payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Failed to close auction" },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
