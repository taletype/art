import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { createSellerArtwork } from "@/lib/seller";
import { createSellerArtworkSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const rateLimit = enforceRouteRateLimit(request, "mint-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return applyRateLimitHeaders(authFailure, rateLimit);
  }

  try {
    const body = await request.json();
    const payload = createSellerArtworkSchema.parse(body);
    const user = await getAuthenticatedAppUser();
    const sellerWallet = user?.walletAddress ?? payload.sellerWallet ?? null;
    if (!sellerWallet || !isValidEvmAddress(sellerWallet)) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Connect a Thirdweb wallet or sign in with a profile wallet before minting." },
          { status: 401 },
        ),
        rateLimit,
      );
    }

    const artwork = await createSellerArtwork({
      ownerUserId: user?.id ?? null,
      sellerWallet,
      title: payload.title,
      description: payload.description,
      imageUrl: payload.imageUrl,
      medium: payload.medium,
      category: payload.category,
      provenanceText: payload.provenanceText,
      priceEth: payload.priceEth,
    });

    return applyRateLimitHeaders(NextResponse.json({ ok: true, artwork }, { status: 201 }), rateLimit);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return applyRateLimitHeaders(
        NextResponse.json({ ok: false, message: "Invalid JSON payload" }, { status: 400 }),
        rateLimit,
      );
    }

    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json({ ok: false, message: "Invalid seller payload", issues: error.issues }, { status: 400 }),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        { ok: false, message: error instanceof Error ? error.message : "Unable to create or prepare artwork" },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}
