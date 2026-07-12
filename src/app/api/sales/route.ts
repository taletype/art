import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { listSales, getSaleById } from "@/lib/supabase-db";

function readSalesListLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(Math.floor(parsed), 100);
}

function readSaleId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function invalidJsonResponse() {
  return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
}

function invalidSalePayloadResponse() {
  return NextResponse.json({ error: "Invalid sale payload" }, { status: 400 });
}

function isMissingSaleError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PGRST116"
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const saleId = readSaleId(searchParams.get("id"));

  if (saleId) {
    const sale = await getSaleById(saleId);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    return NextResponse.json(sale);
  }

  const sales = await listSales(readSalesListLimit(searchParams.get("limit")));
  return NextResponse.json(sales);
}

export async function POST(request: NextRequest) {
  const rateLimit = enforceRouteRateLimit(request, "sales-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return applyRateLimitHeaders(authFailure, rateLimit);
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return applyRateLimitHeaders(invalidSalePayloadResponse(), rateLimit);
    }

    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("auction_sales")
      .insert(body)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return applyRateLimitHeaders(NextResponse.json(data, { status: 201 }), rateLimit);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return applyRateLimitHeaders(invalidJsonResponse(), rateLimit);
    }

    console.error("Error creating sale:", error);
    return applyRateLimitHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create sale" },
        { status: 500 }
      ),
      rateLimit,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimit = enforceRouteRateLimit(request, "sales-patch");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return applyRateLimitHeaders(authFailure, rateLimit);
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return applyRateLimitHeaders(invalidSalePayloadResponse(), rateLimit);
    }

    const { id, ...updates } = body as Record<string, unknown>;
    const saleId = readSaleId(id);
    if (!saleId) {
      return applyRateLimitHeaders(NextResponse.json({ error: "Sale ID is required" }, { status: 400 }), rateLimit);
    }
    if (Object.keys(updates).length === 0) {
      return applyRateLimitHeaders(
        NextResponse.json({ error: "No sale fields provided" }, { status: 400 }),
        rateLimit,
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("auction_sales")
      .update(updates)
      .eq("id", saleId)
      .select("*")
      .single();

    if (error) {
      if (isMissingSaleError(error)) {
        return applyRateLimitHeaders(NextResponse.json({ error: "Sale not found" }, { status: 404 }), rateLimit);
      }

      throw error;
    }

    return applyRateLimitHeaders(NextResponse.json(data), rateLimit);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return applyRateLimitHeaders(invalidJsonResponse(), rateLimit);
    }

    console.error("Error updating sale:", error);
    return applyRateLimitHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update sale" },
        { status: 500 }
      ),
      rateLimit,
    );
  }
}
