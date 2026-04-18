import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { getAuthenticatedAppUser, requireAuthenticatedAppUserResponse, requireLinkedWalletResponse } from "@/lib/auth";
import { createSellerAuction } from "@/lib/seller";
import { listOffchainAuctions } from "@/lib/offchainAuctions";
import { createSellerAuctionSchema } from "@/types/seller";
import { listAuctionsQuerySchema } from "@/types/offchainAuction";

export async function GET(request: Request) {
  const rateLimit = enforceRouteRateLimit(request, "auctions-get", {
    max: Number(process.env.API_AUCTIONS_RATE_LIMIT_MAX || 60),
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const url = new URL(request.url);
    const query = listAuctionsQuerySchema.parse({
      status: url.searchParams.get("status") ?? undefined,
      limit: Number(url.searchParams.get("limit") || "20"),
    });

    const auctions = await listOffchainAuctions(query.status, query.limit);
    return applyRateLimitHeaders(NextResponse.json({ ok: true, auctions }), rateLimit);
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid query", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Failed to list auctions" },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}

export async function POST(request: Request) {
  const sessionUser = await getAuthenticatedAppUser();
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (!sessionUser && authFailure) {
    return authFailure;
  }
  if (!sessionUser) {
    return requireAuthenticatedAppUserResponse();
  }
  if (!sessionUser.walletAddress) {
    return requireLinkedWalletResponse();
  }

  const rateLimit = enforceRouteRateLimit(request, "auctions-post", {
    max: Number(process.env.API_AUCTIONS_RATE_LIMIT_MAX || 30),
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const payload = createSellerAuctionSchema.parse(await request.json());
    const auction = await createSellerAuction({
      artworkId: payload.artworkId,
      ownerUserId: sessionUser.id,
      sellerWallet: sessionUser.walletAddress,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      startPriceLamports: payload.startPriceLamports,
      minIncrementLamports: payload.minIncrementLamports,
    });

    return applyRateLimitHeaders(NextResponse.json({ ok: true, auction }, { status: 201 }), rateLimit);
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid seller auction payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Failed to create auction" },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
