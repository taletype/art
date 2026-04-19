import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SellerArtworkInput = {
  ownerUserId: string;
  sellerWallet: string;
  title: string;
  description: string;
  imageUrl: string;
  medium?: string | null;
  category?: string | null;
  provenanceText?: string | null;
  priceEth?: number | null;
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

  return (data ?? []).map((artwork) => ({
    ...artwork,
    linked_auction_id: typeof artwork.thirdweb_listing_id === "string" ? artwork.thirdweb_listing_id : null,
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
      reserve_price_lamports: null,
      price_sol: input.priceEth ?? 0,
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
