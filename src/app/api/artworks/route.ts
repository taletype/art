import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { createSellerArtworkSchema } from "@/types/seller";

const adminClient = createSupabaseAdminClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

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

  const owner = searchParams.get("owner");
  const sellerWallet = searchParams.get("sellerWallet");
  let query = adminClient.from("artworks").select("*").order("created_at", { ascending: false });
  if (owner) {
    query = query.eq("owner_user_id", owner);
  }
  if (sellerWallet && isValidEvmAddress(sellerWallet)) {
    query = query.eq("seller_wallet", sellerWallet);
  }
  const { data: artworks, error } = await query.limit(searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(artworks);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedAppUser();
    const body = createSellerArtworkSchema.parse(await request.json());
    const sellerWallet = user?.walletAddress ?? body.sellerWallet ?? null;
    if (!sellerWallet || !isValidEvmAddress(sellerWallet)) {
      return NextResponse.json(
        { error: "Connect a Thirdweb wallet or sign in with a profile wallet before creating a draft." },
        { status: 401 },
      );
    }

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

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error creating artwork:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create artwork" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedAppUser();
    const body = await request.json();
    const { id, ...updates } = body;
    delete updates.sellerWallet;
    if (!id) {
      return NextResponse.json({ error: "Artwork ID is required" }, { status: 400 });
    }

    const requestedSellerWallet =
      typeof body.seller_wallet === "string" && isValidEvmAddress(body.seller_wallet)
        ? body.seller_wallet
        : typeof body.sellerWallet === "string" && isValidEvmAddress(body.sellerWallet)
          ? body.sellerWallet
          : null;
    const actorWallet = user?.walletAddress ?? requestedSellerWallet;
    if (!user && !actorWallet) {
      return NextResponse.json(
        { error: "Connect a Thirdweb wallet or sign in before updating artwork." },
        { status: 401 },
      );
    }

    let query = adminClient
      .from("artworks")
      .update(updates)
      .eq("id", id);

    if (user && actorWallet) {
      query = query.or(`owner_user_id.eq.${user.id},seller_wallet.eq.${actorWallet}`);
    } else if (user) {
      query = query.eq("owner_user_id", user.id);
    } else {
      query = query.eq("seller_wallet", actorWallet);
    }

    const { data, error } = await query.select("*").single();

    if (error) {
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating artwork:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update artwork" },
      { status: 500 }
    );
  }
}
