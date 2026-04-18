import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prepareThirdwebArtworkAsset, prepareThirdwebAuction } from "@/lib/thirdwebMarketplace";

export type SellerArtworkInput = {
  ownerUserId: string;
  sellerWallet: string;
  title: string;
  description: string;
  imageUrl: string;
  medium?: string | null;
  category?: string | null;
  provenanceText?: string | null;
  reservePriceLamports?: number | null;
};

export type AuctionLaunchInput = {
  artworkId: string;
  ownerUserId: string;
  sellerWallet: string;
  startsAt: string;
  endsAt: string;
  startPriceLamports: number;
  minIncrementLamports: number;
};

export async function listSellerArtworks(ownerUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createSellerArtwork(input: SellerArtworkInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("artworks")
    .insert({
      title: input.title,
      description: input.description,
      artist_name: input.title,
      artist_wallet: input.sellerWallet,
      owner_user_id: input.ownerUserId,
      seller_wallet: input.sellerWallet,
      image_url: input.imageUrl,
      medium: input.medium ?? null,
      category: input.category ?? null,
      provenance_text: input.provenanceText ?? null,
      reserve_price_lamports: input.reservePriceLamports ?? null,
      price_sol: input.reservePriceLamports ? input.reservePriceLamports / 1_000_000_000 : 0,
      status: "draft",
      seller_flow_status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function prepareArtworkWithThirdweb(artworkId: string, ownerUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: artwork, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", artworkId)
    .eq("owner_user_id", ownerUserId)
    .single();

  if (error || !artwork) {
    throw new Error("Artwork not found.");
  }

  const asset = await prepareThirdwebArtworkAsset({
    artworkId: artwork.id,
    ownerUserId,
    sellerWallet: artwork.seller_wallet ?? artwork.artist_wallet,
    title: artwork.title,
    description: artwork.description ?? "",
    imageUrl: artwork.image_url ?? "",
  });

  const { data, error: updateError } = await supabase
    .from("artworks")
    .update({
      thirdweb_provider: asset.provider,
      thirdweb_chain: asset.chain,
      thirdweb_contract_address: asset.contractAddress,
      thirdweb_token_id: asset.tokenId,
      thirdweb_asset_url: asset.externalUrl,
      sync_status: asset.syncStatus,
      seller_flow_status: "prepared",
    })
    .eq("id", artworkId)
    .eq("owner_user_id", ownerUserId)
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  return data;
}

export async function createSellerAuction(input: AuctionLaunchInput) {
  const supabase = createSupabaseAdminClient();
  const { data: artwork, error: artworkError } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", input.artworkId)
    .eq("owner_user_id", input.ownerUserId)
    .single();

  if (artworkError || !artwork) {
    throw new Error("Artwork not found.");
  }

  const { data: existing } = await supabase
    .from("offchain_auctions")
    .select("id,status")
    .eq("artwork_id", input.artworkId)
    .in("status", ["draft", "live"])
    .limit(1);

  if (existing?.length) {
    throw new Error("This artwork already has an active auction.");
  }

  const auctionRef = await prepareThirdwebAuction({
    artworkId: artwork.id,
    title: artwork.title,
    description: artwork.description ?? "",
    imageUrl: artwork.image_url ?? "",
    sellerWallet: input.sellerWallet,
    startPriceLamports: input.startPriceLamports,
    minIncrementLamports: input.minIncrementLamports,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  });

  const { data: auction, error: auctionError } = await supabase
    .from("offchain_auctions")
    .insert({
      artwork_id: artwork.id,
      owner_user_id: input.ownerUserId,
      seller_wallet: input.sellerWallet,
      title: artwork.title,
      description: artwork.description ?? "",
      asset_url: artwork.image_url ?? "",
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      start_price_lamports: input.startPriceLamports,
      min_increment_lamports: input.minIncrementLamports,
      status: "live",
      auction_source: "thirdweb",
      thirdweb_provider: auctionRef.provider,
      thirdweb_chain: auctionRef.chain,
      thirdweb_contract_address: auctionRef.contractAddress,
      thirdweb_listing_id: auctionRef.listingId,
      thirdweb_listing_url: auctionRef.externalUrl,
      sync_status: auctionRef.syncStatus,
    })
    .select("*")
    .single();

  if (auctionError) {
    throw auctionError;
  }

  const { error: artworkUpdateError } = await supabase
    .from("artworks")
    .update({
      seller_flow_status: "in_auction",
      status: "live",
      sync_status: auctionRef.syncStatus,
      thirdweb_provider: auctionRef.provider,
      thirdweb_chain: auctionRef.chain,
      thirdweb_contract_address: auctionRef.contractAddress,
      thirdweb_listing_id: auctionRef.listingId,
      thirdweb_listing_url: auctionRef.externalUrl,
    })
    .eq("id", input.artworkId)
    .eq("owner_user_id", input.ownerUserId);

  if (artworkUpdateError) {
    throw artworkUpdateError;
  }

  return auction;
}
