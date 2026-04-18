import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertListingExists,
  assertMintedNftOwnedBySeller,
  confirmSolanaTransaction,
  prepareSolanaListingTransaction,
  prepareSolanaMintTransaction,
} from "@/lib/solanaSellerTransactions";

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

  const artworks = data ?? [];
  if (!artworks.length) {
    return artworks;
  }

  const artworkIds = artworks.map((artwork) => artwork.id);
  const { data: auctions, error: auctionsError } = await supabase
    .from("offchain_auctions")
    .select("id, artwork_id, created_at")
    .in("artwork_id", artworkIds)
    .order("created_at", { ascending: false });

  if (auctionsError) {
    throw auctionsError;
  }

  const latestAuctionIdByArtworkId = new Map<string, string>();
  for (const auction of auctions ?? []) {
    if (typeof auction.artwork_id === "string" && typeof auction.id === "string" && !latestAuctionIdByArtworkId.has(auction.artwork_id)) {
      latestAuctionIdByArtworkId.set(auction.artwork_id, auction.id);
    }
  }

  return artworks.map((artwork) => ({
    ...artwork,
    linked_auction_id: latestAuctionIdByArtworkId.get(artwork.id) ?? null,
  }));
}

export async function createSellerArtwork(input: SellerArtworkInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("artworks")
    .insert({
      title: input.title,
      description: input.description,
      artist_name: input.sellerWallet,
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

async function getOwnedArtwork(artworkId: string, ownerUserId: string) {
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

  return artwork;
}

export async function prepareArtworkMintForSolanaDevnet(artworkId: string, ownerUserId: string, sellerWallet: string) {
  const artwork = await getOwnedArtwork(artworkId, ownerUserId);

  if (artwork.seller_flow_status === "prepared" || artwork.seller_flow_status === "in_auction") {
    throw new Error("This artwork has already been minted for Seller Hub.");
  }

  return prepareSolanaMintTransaction({
    artworkId: artwork.id,
    sellerWallet,
    title: artwork.title,
    description: artwork.description ?? null,
    imageUrl: artwork.image_url ?? null,
  });
}

export async function finalizeArtworkMintForSolanaDevnet(input: {
  artworkId: string;
  ownerUserId: string;
  sellerWallet: string;
  txSignature: string;
  mintAddress: string;
  metadataAddress: string;
  tokenAccountAddress: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
}) {
  const artwork = await getOwnedArtwork(input.artworkId, input.ownerUserId);

  await confirmSolanaTransaction({
    signature: input.txSignature,
    recentBlockhash: input.recentBlockhash,
    lastValidBlockHeight: input.lastValidBlockHeight,
  });
  const minted = await assertMintedNftOwnedBySeller({
    sellerWallet: input.sellerWallet,
    mintAddress: input.mintAddress,
    metadataAddress: input.metadataAddress,
    tokenAccountAddress: input.tokenAccountAddress,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error: updateError } = await supabase
    .from("artworks")
    .update({
      seller_wallet: input.sellerWallet,
      artist_wallet: input.sellerWallet,
      thirdweb_provider: "solana",
      thirdweb_chain: "devnet",
      thirdweb_contract_address: input.mintAddress,
      thirdweb_token_id: input.mintAddress,
      thirdweb_asset_url: minted.assetUrl,
      thirdweb_listing_id: null,
      thirdweb_listing_url: null,
      sync_status: "mint_confirmed",
      seller_flow_status: "prepared",
    })
    .eq("id", artwork.id)
    .eq("owner_user_id", input.ownerUserId)
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  return data;
}

export async function prepareSellerAuction(input: AuctionLaunchInput & { mintAddress?: string | null }) {
  const artwork = await getOwnedArtwork(input.artworkId, input.ownerUserId);

  if (artwork.seller_flow_status !== "prepared") {
    throw new Error("Mint the artwork on Solana devnet before launching the auction.");
  }

  const { data: existing, error: existingError } = await createSupabaseAdminClient()
    .from("offchain_auctions")
    .select("id,status")
    .eq("artwork_id", input.artworkId)
    .in("status", ["draft", "live"])
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existing?.length) {
    throw new Error("This artwork already has an active auction.");
  }

  const mintedAddress =
    input.mintAddress?.trim() ||
    artwork.thirdweb_token_id ||
    artwork.thirdweb_contract_address ||
    null;
  if (!mintedAddress) {
    throw new Error("Seller Hub could not find the minted NFT address for this artwork.");
  }

  return prepareSolanaListingTransaction({
    sellerWallet: input.sellerWallet,
    mintAddress: mintedAddress,
    startPriceLamports: input.startPriceLamports,
  });
}

export async function finalizeSellerAuction(input: AuctionLaunchInput & {
  txSignature: string;
  listingAddress: string;
  mintAddress: string;
  recentBlockhash: string;
  lastValidBlockHeight: number;
}) {
  const supabase = createSupabaseAdminClient();
  const artwork = await getOwnedArtwork(input.artworkId, input.ownerUserId);

  const { data: existing } = await supabase
    .from("offchain_auctions")
    .select("id,status")
    .eq("artwork_id", input.artworkId)
    .in("status", ["draft", "live"])
    .limit(1);

  if (existing?.length) {
    throw new Error("This artwork already has an active auction.");
  }

  await confirmSolanaTransaction({
    signature: input.txSignature,
    recentBlockhash: input.recentBlockhash,
    lastValidBlockHeight: input.lastValidBlockHeight,
  });
  const listing = await assertListingExists({
    listingAddress: input.listingAddress,
    mintAddress: input.mintAddress,
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
      auction_source: "solana-devnet",
      thirdweb_provider: "solana",
      thirdweb_chain: "devnet",
      thirdweb_contract_address: input.mintAddress,
      thirdweb_listing_id: input.listingAddress,
      thirdweb_listing_url: listing.listingUrl,
      sync_status: "auction_confirmed",
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
      sync_status: "auction_confirmed",
      thirdweb_provider: "solana",
      thirdweb_chain: "devnet",
      thirdweb_contract_address: input.mintAddress,
      thirdweb_token_id: input.mintAddress,
      thirdweb_listing_id: input.listingAddress,
      thirdweb_listing_url: listing.listingUrl,
    })
    .eq("id", input.artworkId)
    .eq("owner_user_id", input.ownerUserId);

  if (artworkUpdateError) {
    throw artworkUpdateError;
  }

  return auction;
}
