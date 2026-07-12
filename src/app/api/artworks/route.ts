import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { applyRateLimitHeaders, enforceRouteRateLimit, optionalBearerAuth } from "@/lib/apiGuards";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { createSellerArtworkSchema } from "@/types/seller";

const protectedArtworkUpdateFields = [
  "id",
  "ownerUserId",
  "owner_user_id",
  "sellerWallet",
  "seller_wallet",
  "artistWallet",
  "artist_wallet",
];

function removeProtectedArtworkUpdateFields(updates: Record<string, unknown>) {
  for (const field of protectedArtworkUpdateFields) {
    delete updates[field];
  }

  return updates;
}

function readArtworkListLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(Math.floor(parsed), 100);
}

function readSearchText(value: string | null) {
  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function invalidJsonResponse() {
  return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
}

function isMissingArtworkError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "PGRST116"
  );
}

function normalizeEvmAddress(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return isValidEvmAddress(trimmedValue) ? trimmedValue : null;
}

function readRequestedSellerWallet(body: Record<string, unknown>) {
  return normalizeEvmAddress(body.seller_wallet) ?? normalizeEvmAddress(body.sellerWallet);
}

function readArtworkId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = readArtworkId(searchParams.get("id"));
  const adminClient = createSupabaseAdminClient();

  if (id) {
    const { data: artwork, error } = await adminClient
      .from("artworks")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !artwork) {
      return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
    }
    return NextResponse.json(artwork);
  }

  const owner = readSearchText(searchParams.get("owner"));
  const sellerWallet = normalizeEvmAddress(searchParams.get("sellerWallet"));
  let query = adminClient.from("artworks").select("*").order("created_at", { ascending: false });
  if (owner) {
    query = query.eq("owner_user_id", owner);
  }
  if (sellerWallet) {
    query = query.eq("seller_wallet", sellerWallet);
  }
  const { data: artworks, error } = await query.limit(readArtworkListLimit(searchParams.get("limit")));
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(artworks);
}

export async function POST(request: NextRequest) {
  const rateLimit = enforceRouteRateLimit(request, "artworks-post");
  if (!rateLimit.ok) {
    return rateLimit.response;
  }

  const authFailure = optionalBearerAuth(request, "API_WRITE_BEARER_TOKEN");
  if (authFailure) {
    return applyRateLimitHeaders(authFailure, rateLimit);
  }

  try {
    const body = createSellerArtworkSchema.parse(await request.json());
    const user = await getAuthenticatedAppUser();
    const sellerWallet = user?.walletAddress ?? body.sellerWallet ?? null;
    if (!sellerWallet || !isValidEvmAddress(sellerWallet)) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { error: "Connect a Thirdweb wallet or sign in with a profile wallet before creating a draft." },
          { status: 401 },
        ),
        rateLimit,
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("artworks")
      .insert({
        title: body.title,
        description: body.description,
        image_url: body.imageUrl,
        medium: body.medium ?? null,
        category: body.category ?? null,
        provenance_text: body.provenanceText ?? null,
        reserve_price_lamports: null,
        owner_user_id: user?.id ?? null,
        seller_wallet: sellerWallet,
        artist_wallet: sellerWallet,
        artist_name: user?.email ?? sellerWallet,
        price_sol: body.priceEth ?? 0,
        status: "draft",
        seller_flow_status: "draft",
      })
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

    if (error instanceof ZodError) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { error: "Invalid artwork payload", issues: error.issues },
          { status: 400 },
        ),
        rateLimit,
      );
    }

    console.error("Error creating artwork:", error);
    return applyRateLimitHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create artwork" },
        { status: 500 }
      ),
      rateLimit,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimit = enforceRouteRateLimit(request, "artworks-patch");
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
      return applyRateLimitHeaders(NextResponse.json({ error: "Invalid artwork payload" }, { status: 400 }), rateLimit);
    }

    const { id, ...rawUpdates } = body as Record<string, unknown>;
    const artworkId = readArtworkId(id);
    const updates = removeProtectedArtworkUpdateFields(rawUpdates);
    if (!artworkId) {
      return applyRateLimitHeaders(NextResponse.json({ error: "Artwork ID is required" }, { status: 400 }), rateLimit);
    }
    if (Object.keys(updates).length === 0) {
      return applyRateLimitHeaders(
        NextResponse.json({ error: "No mutable artwork fields provided" }, { status: 400 }),
        rateLimit,
      );
    }

    const requestedSellerWallet = readRequestedSellerWallet(body);
    const user = await getAuthenticatedAppUser();
    const actorWallet = user?.walletAddress ?? requestedSellerWallet;
    if (!user && !actorWallet) {
      return applyRateLimitHeaders(
        NextResponse.json(
          { error: "Connect a Thirdweb wallet or sign in before updating artwork." },
          { status: 401 },
        ),
        rateLimit,
      );
    }

    const adminClient = createSupabaseAdminClient();
    let query = adminClient
      .from("artworks")
      .update(updates)
      .eq("id", artworkId);

    if (user && actorWallet) {
      query = query.or(`owner_user_id.eq.${user.id},seller_wallet.eq.${actorWallet}`);
    } else if (user) {
      query = query.eq("owner_user_id", user.id);
    } else {
      query = query.eq("seller_wallet", actorWallet);
    }

    const { data, error } = await query.select("*").single();

    if (error) {
      if (isMissingArtworkError(error)) {
        return applyRateLimitHeaders(NextResponse.json({ error: "Artwork not found" }, { status: 404 }), rateLimit);
      }

      throw error;
    }

    return applyRateLimitHeaders(NextResponse.json(data), rateLimit);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return applyRateLimitHeaders(invalidJsonResponse(), rateLimit);
    }

    console.error("Error updating artwork:", error);
    return applyRateLimitHeaders(
      NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to update artwork" },
        { status: 500 }
      ),
      rateLimit,
    );
  }
}
