import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "../../../lib/apiGuards";
import {
  confirmPreparedPurchase,
  getPurchaseState,
  inspectPurchaseSignature,
  preparePurchaseTransaction,
} from "../../../lib/auctionHouse";
import { purchaseConfirmRequestSchema, purchasePrepareRequestSchema } from "../../../types/art";

export async function POST(request: Request) {
  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "purchase-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  try {
    const body = (await request.json()) as { action?: "prepare" | "confirm"; payload?: unknown };
    const action = body.action ?? "prepare";

    if (action === "confirm") {
      const confirmPayload = purchaseConfirmRequestSchema.parse(body.payload);
      const confirmed = await confirmPreparedPurchase(confirmPayload);

      return applyRateLimitHeaders(
        NextResponse.json({
          ok: confirmed.status === "TX_CONFIRMED",
          purchase: confirmed,
        }),
        rateLimit,
      );
    }

    const preparePayload = purchasePrepareRequestSchema.parse(body.payload);
    const prepared = await preparePurchaseTransaction(preparePayload);

    return applyRateLimitHeaders(
      NextResponse.json({
        ok: prepared.status === "TX_PREPARED",
        purchase: prepared,
      }),
      rateLimit,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { ok: false, message: "Invalid purchase payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    return applyRateLimitHeaders(
      NextResponse.json(
        {
          ok: false,
          message: error instanceof Error ? error.message : "Unknown purchase error",
        },
        { status: 500 },
      ),
      rateLimit,
    );
  }
}

export async function GET(request: Request) {
  const authFailure = optionalBearerAuth(request, "API_READ_BEARER_TOKEN");
  if (authFailure) {
    return authFailure;
  }

  const rateLimit = enforceRouteRateLimit(request, "purchase-get", {
    max: Number(process.env.API_READ_RATE_LIMIT_MAX || 60),
  });
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const url = new URL(request.url);
  const idempotencyKey = url.searchParams.get("idempotencyKey");
  const txSignature = url.searchParams.get("txSignature");

  if (!idempotencyKey && !txSignature) {
    return applyRateLimitHeaders(
      NextResponse.json({ ok: false, message: "idempotencyKey or txSignature is required" }, { status: 400 }),
      rateLimit,
    );
  }

  if (idempotencyKey) {
    const state = await getPurchaseState(idempotencyKey);
    if (state) {
      return applyRateLimitHeaders(NextResponse.json({ ok: true, purchase: state, source: "store" }), rateLimit);
    }
  }

  if (txSignature) {
    const recovered = await inspectPurchaseSignature(txSignature);
    return applyRateLimitHeaders(
      NextResponse.json({ ok: recovered.status === "TX_CONFIRMED", purchase: recovered, source: "rpc" }),
      rateLimit,
    );
  }

  return applyRateLimitHeaders(
    NextResponse.json({ ok: false, message: "Not found" }, { status: 404 }),
    rateLimit,
  );
}
