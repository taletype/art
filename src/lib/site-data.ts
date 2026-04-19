import {
  listArtworks,
  getArtworkById as getSupabaseArtworkById,
  listSales,
  getSaleById as getSupabaseSaleById,
  getCreatorByWallet as getSupabaseCreatorByWallet,
  listCreators,
} from "@/lib/supabase-db";

export type ArtworkRecord = {
  id: string;
  title: string;
  artistName: string;
  artistHandle: string;
  artistWallet: string;
  priceSol: number;
  category: string;
  medium: string;
  edition: string;
  year: number;
  description: string;
  story: string;
  collectorNote: string;
  availability: string;
  background: string;
  accent: string;
  evidenceLabels: string[];
  sale_id?: string;
};

export type AuctionLotStatus = "upcoming" | "live" | "sold" | "passed";

export type AuctionLotRecord = ArtworkRecord & {
  lotNumber: number;
  saleId: string;
  estimateLowSol: number;
  estimateHighSol: number;
  reserveSol: number;
  currentBidSol: number;
  minimumNextBidSol: number;
  bidCount: number;
  watchCount: number;
  status: AuctionLotStatus;
  closesAt: string;
  conditionReport: string;
  provenanceStatement: string;
  authenticityStatement: string;
  buyerPremiumBps: number;
  platformSellerCommissionBps: number;
};

export type AuctionSaleRecord = {
  id: string;
  title: string;
  subtitle: string;
  curatorName: string;
  curatorNote: string;
  opensAt: string;
  closesAt: string;
  heroLotId: string;
  lotIds: string[];
  status: "preview" | "live" | "closed";
  category: string;
  location: string;
};

export type CreatorRecord = {
  wallet: string;
  name: string;
  handle: string;
  location: string;
  discipline: string;
  bio: string;
  heroStatement: string;
  artworkIds: string[];
};

export const platformStats = [
  { label: "Human-made lots", value: "42" },
  { label: "Reviewed artist packets", value: "1.9k" },
  { label: "Base settlement target", value: "< 30s" },
];

export const trustSignals = [
  {
    label: "Human-made only",
    description: "Every lot is reviewed for human authorship before auction placement. AI-generated and AI-assisted artworks are not accepted.",
  },
  {
    label: "Curator-led sales",
    description: "Overlooked artists are placed into selective auction events with catalog notes, estimates, reserves, and collector context.",
  },
  {
    label: "Provenance packets",
    description: "Artist evidence, condition notes, reviewer attestations, buyer premium, and onchain settlement details stay visible in the catalog path.",
  },
];

// Helper function for generating titles from IDs (used for dynamic routes)
function titleFromId(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getFeaturedArtworks() {
  const data = await listArtworks(6);
  return data;
}

export async function getFeaturedArtwork() {
  const data = await listArtworks(1);
  return data[0] ?? null;
}

export async function getArtworkById(id: string) {
  const data = await getSupabaseArtworkById(id);
  return data as AuctionLotRecord | null;
}

export async function getCreators() {
  const data = await listCreators();
  return data;
}

export async function getCreatorByWallet(wallet: string) {
  const data = await getSupabaseCreatorByWallet(wallet);
  if (data) {
    return data as CreatorRecord;
  }

  const artworks = await listArtworks();
  const creatorArtworks = artworks.filter(
    (artwork) => artwork.artist_wallet === wallet || artwork.seller_wallet === wallet,
  );

  if (!creatorArtworks.length) {
    return null;
  }

  const firstArtwork = creatorArtworks[0] as Record<string, unknown>;
  const artistName =
    typeof firstArtwork.artist_name === "string" && firstArtwork.artist_name.trim()
      ? firstArtwork.artist_name
      : typeof firstArtwork.artistName === "string" && firstArtwork.artistName.trim()
        ? firstArtwork.artistName
        : `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  return {
    wallet,
    name: artistName,
    handle:
      typeof firstArtwork.artist_handle === "string" && firstArtwork.artist_handle.trim()
        ? firstArtwork.artist_handle
        : "@seller",
    location: "Online",
    discipline:
      typeof firstArtwork.medium === "string" && firstArtwork.medium.trim()
        ? firstArtwork.medium
        : "Digital art",
    bio:
      typeof firstArtwork.description === "string" && firstArtwork.description.trim()
        ? firstArtwork.description
        : "Seller profile generated from published artwork records.",
    heroStatement: "Built from seller-linked artwork records.",
    artworkIds: creatorArtworks.map((artwork) => artwork.id),
  } satisfies CreatorRecord;
}

export async function getCreatorArtworks(wallet: string) {
  const artworks = await listArtworks();
  return artworks.filter(a => a.artist_wallet === wallet || a.seller_wallet === wallet);
}

export async function getAuctionSales() {
  const data = await listSales();
  return data;
}

export async function getAuctionSaleById(id: string) {
  const data = await getSupabaseSaleById(id);
  return data as AuctionSaleRecord | null;
}

export async function getAuctionLotsBySaleId(saleId: string) {
  const artworks = await listArtworks();
  return artworks.filter(lot => lot.sale_id === saleId) as AuctionLotRecord[];
}

export async function getAuctionLotById(lotId: string) {
  const data = await getSupabaseArtworkById(lotId);
  return data as AuctionLotRecord | null;
}

export async function getSaleForLot(lotId: string) {
  const lot = await getAuctionLotById(lotId);
  return lot && lot.sale_id ? getAuctionSaleById(lot.sale_id) : null;
}
