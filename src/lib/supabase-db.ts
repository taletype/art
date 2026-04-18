import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const supabaseAdmin = createSupabaseAdminClient();

// Auctions
export async function listAuctions(status?: string, limit = 20) {
  let query = supabase
    .from("offchain_auctions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching auctions:", error);
    return [];
  }
  return data ?? [];
}

export async function getAuctionById(id: string) {
  const { data, error } = await supabase
    .from("offchain_auctions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching auction:", error);
    return null;
  }
  return data;
}

export async function createAuction(auction: {
  seller_wallet: string;
  title: string;
  description: string;
  asset_url: string;
  starts_at: string;
  ends_at: string;
  start_price_lamports: number;
  min_increment_lamports: number;
  status?: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("offchain_auctions")
    .insert(auction)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating auction:", error);
    throw error;
  }
  return data;
}

export async function updateAuction(id: string, updates: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from("offchain_auctions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating auction:", error);
    throw error;
  }
  return data;
}

// Bids
export async function listBidsForAuction(auctionId: string) {
  const { data, error } = await supabase
    .from("offchain_bids")
    .select("*")
    .eq("auction_id", auctionId)
    .order("amount_lamports", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bids:", error);
    return [];
  }
  return data ?? [];
}

export async function createBid(bid: {
  auction_id: string;
  bidder_wallet: string;
  amount_lamports: number;
  is_winning?: boolean;
}) {
  const { data, error } = await supabaseAdmin
    .from("offchain_bids")
    .insert(bid)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating bid:", error);
    throw error;
  }
  return data;
}

export async function updateBid(id: string, updates: Record<string, any>) {
  const { data, error } = await supabaseAdmin
    .from("offchain_bids")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating bid:", error);
    throw error;
  }
  return data;
}

// Artworks
export async function listArtworks(limit = 20) {
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching artworks:", error);
    return [];
  }
  return data ?? [];
}

export async function getArtworkById(id: string) {
  const { data, error } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching artwork:", error);
    return null;
  }
  return data;
}

export async function createArtwork(artwork: Record<string, any>) {
  const { data, error } = await supabase
    .from("artworks")
    .insert(artwork)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating artwork:", error);
    throw error;
  }
  return data;
}

export async function updateArtwork(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("artworks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating artwork:", error);
    throw error;
  }
  return data;
}

// Sales
export async function listSales(limit = 20) {
  const { data, error } = await supabase
    .from("auction_sales")
    .select("*")
    .order("opens_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching sales:", error);
    return [];
  }
  return data ?? [];
}

export async function getSaleById(id: string) {
  const { data, error } = await supabase
    .from("auction_sales")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching sale:", error);
    return null;
  }
  return data;
}

export async function createSale(sale: Record<string, any>) {
  const { data, error } = await supabase
    .from("auction_sales")
    .insert(sale)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
  return data;
}

export async function updateSale(id: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("auction_sales")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
  return data;
}

// Creators
export async function listCreators(limit = 20) {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching creators:", error);
    return [];
  }
  return data ?? [];
}

export async function getCreatorByWallet(wallet: string) {
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("wallet", wallet)
    .single();

  if (error) {
    console.error("Error fetching creator:", error);
    return null;
  }
  return data;
}

export async function createCreator(creator: Record<string, any>) {
  const { data, error } = await supabase
    .from("creators")
    .insert(creator)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating creator:", error);
    throw error;
  }
  return data;
}

export async function updateCreator(wallet: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from("creators")
    .update(updates)
    .eq("wallet", wallet)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating creator:", error);
    throw error;
  }
  return data;
}
