import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const supabaseAdmin = createSupabaseAdminClient();

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
