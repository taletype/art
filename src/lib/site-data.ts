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
  { label: "Devnet settlement target", value: "< 30s" },
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
    description: "Artist evidence, condition notes, reviewer attestations, buyer premium, and Solana settlement details stay visible in the catalog path.",
  },
];

const artworks: ArtworkRecord[] = [
  {
    id: "ethereal-waves",
    title: "Ethereal Waves",
    artistName: "Mina Sol",
    artistHandle: "@creative.soul",
    artistWallet: "creative-soul",
    priceSol: 5.2,
    category: "Digital Painting",
    medium: "Procreate + custom texture scans",
    edition: "1 of 1",
    year: 2026,
    description: "A luminous seascape blending painterly brushwork with layered scanned pigments.",
    story: "Built from over thirty iterative studies, this work captures the moment where analog texture and digital light collapse into one frame.",
    collectorNote: "Includes layered source file hashes, two work-in-progress captures, and reviewer approval notes.",
    availability: "Available now",
    background: "linear-gradient(135deg, rgba(91, 33, 182, 0.95), rgba(236, 72, 153, 0.65), rgba(250, 204, 21, 0.28))",
    accent: "#f7d774",
    evidenceLabels: ["Source file hash", "WIP capture", "Reviewer attestation"],
  },
  {
    id: "neon-landscapes",
    title: "Neon Landscapes",
    artistName: "Ari Vega",
    artistHandle: "@visual.artist",
    artistWallet: "visual-artist",
    priceSol: 3.8,
    category: "3D Art",
    medium: "Cinema4D + shader studies",
    edition: "Open edition • capped at 25",
    year: 2026,
    description: "Retro-futurist terrain forms rendered with fluorescent shadows and cinematic depth.",
    story: "The scene was assembled from custom topology sketches and hand-tuned lighting passes, with no AI-generated or AI-assisted imagery.",
    collectorNote: "Collector package includes timelapse renders and project-file evidence references.",
    availability: "6 editions remaining",
    background: "linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(6, 182, 212, 0.7), rgba(255, 255, 255, 0.1))",
    accent: "#7dd3fc",
    evidenceLabels: ["Project file", "Timelapse export", "Creation attestation"],
  },
  {
    id: "abstract-dimensions",
    title: "Abstract Dimensions",
    artistName: "Studio Parcel",
    artistHandle: "@studio.collective",
    artistWallet: "studio-collective",
    priceSol: 7.1,
    category: "Generative",
    medium: "Custom code + hand-directed parameter sketches",
    edition: "Series of 12",
    year: 2026,
    description: "Geometric tension and controlled randomness layered into a gallery-scale generative composition.",
    story: "Each variation comes from a hand-authored ruleset, then curated through a review board before publication.",
    collectorNote: "The provenance packet captures the approved seed, code snapshot hash, and process notes.",
    availability: "Waitlist",
    background: "linear-gradient(135deg, rgba(22, 101, 52, 0.95), rgba(16, 185, 129, 0.65), rgba(134, 239, 172, 0.2))",
    accent: "#86efac",
    evidenceLabels: ["Code snapshot", "Seed record", "Review decision"],
  },
  {
    id: "chromatic-fusion",
    title: "Chromatic Fusion",
    artistName: "Noor Vale",
    artistHandle: "@color.explorer",
    artistWallet: "color-explorer",
    priceSol: 4.5,
    category: "Digital Painting",
    medium: "Layered gouache scans + digital finishing",
    edition: "1 of 1",
    year: 2025,
    description: "A color-led study in motion where scanned marks are rebuilt into a luminous final canvas.",
    story: "Noor begins on paper, captures every stage, then composes the final frame digitally to preserve the evidence chain.",
    collectorNote: "Includes source scans, revision frames, and artist attestation metadata.",
    availability: "Reserve open",
    background: "linear-gradient(135deg, rgba(217, 119, 6, 0.95), rgba(239, 68, 68, 0.7), rgba(251, 191, 36, 0.2))",
    accent: "#fbbf24",
    evidenceLabels: ["Scan archive", "WIP board", "Artist signature ref"],
  },
  {
    id: "quantum-dreams",
    title: "Quantum Dreams",
    artistName: "Lio Mercer",
    artistHandle: "@mind.canvas",
    artistWallet: "mind-canvas",
    priceSol: 6.2,
    category: "3D Art",
    medium: "Blender sculpt + compositing",
    edition: "Collector edition of 10",
    year: 2026,
    description: "A dreamlike sculptural environment balancing soft lighting, reflective surfaces, and cinematic framing.",
    story: "The piece evolved across multiple blocked scenes before one final composition earned curator approval.",
    collectorNote: "Evidence includes raw captures, project files, and the final review log.",
    availability: "3 editions remaining",
    background: "linear-gradient(135deg, rgba(88, 28, 135, 0.95), rgba(99, 102, 241, 0.7), rgba(129, 140, 248, 0.2))",
    accent: "#c4b5fd",
    evidenceLabels: ["Raw capture", "Project file", "Review log"],
  },
  {
    id: "crystalline-forms",
    title: "Crystalline Forms",
    artistName: "Tao Ren",
    artistHandle: "@geometry.master",
    artistWallet: "geometry-master",
    priceSol: 5.9,
    category: "Generative",
    medium: "Interactive geometry system",
    edition: "Series of 20",
    year: 2026,
    description: "A faceted field of mirrored structures shaped by a human-authored geometry engine.",
    story: "Every release candidate is reviewed against the saved process packet to preserve human authorship and consistency.",
    collectorNote: "Collector access includes the provenance summary and signed review outcome.",
    availability: "Mint window open",
    background: "linear-gradient(135deg, rgba(14, 116, 144, 0.95), rgba(59, 130, 246, 0.68), rgba(191, 219, 254, 0.2))",
    accent: "#93c5fd",
    evidenceLabels: ["Parameter pack", "Session notes", "Signed review"],
  },
];

const auctionSales: AuctionSaleRecord[] = [
  {
    id: "contemporary-digital-asia",
    title: "Contemporary Digital Asia",
    subtitle: "A timed evening sale of verified human-made 1/1 and limited digital works from overlooked Asian and diaspora artists.",
    curatorName: "HUMAN_ Curatorial Desk",
    curatorNote:
      "This sale favors process-rich, human-made works where collector confidence comes from authorship evidence, editorial context, and transparent on-chain settlement.",
    opensAt: "2026-04-10T12:00:00.000Z",
    closesAt: "2026-05-15T14:00:00.000Z",
    heroLotId: "ethereal-waves",
    lotIds: ["ethereal-waves", "abstract-dimensions", "crystalline-forms"],
    status: "live",
    category: "Digital art",
    location: "Hong Kong / Online",
  },
  {
    id: "new-collectors-evening",
    title: "New Collectors Evening Sale",
    subtitle: "Accessible human-made works with verified provenance, transparent estimates, reserve guidance, and collector-friendly bidding.",
    curatorName: "Mina Lau",
    curatorNote:
      "A concise sale for new collectors who want formal lot details and overlooked human artists who need a serious first auction context.",
    opensAt: "2026-05-22T11:00:00.000Z",
    closesAt: "2026-05-29T13:00:00.000Z",
    heroLotId: "neon-landscapes",
    lotIds: ["neon-landscapes", "chromatic-fusion", "quantum-dreams"],
    status: "preview",
    category: "Emerging artists",
    location: "Online",
  },
];

const auctionLots: AuctionLotRecord[] = artworks.map((artwork, index) => {
  const sale = auctionSales.find((candidate) => candidate.lotIds.includes(artwork.id)) ?? auctionSales[0];
  const estimateLowSol = Math.max(1, Number((artwork.priceSol * 0.8).toFixed(1)));
  const estimateHighSol = Number((artwork.priceSol * 1.35).toFixed(1));
  const currentBidSol = index % 3 === 0 ? Number((estimateLowSol * 0.92).toFixed(1)) : 0;
  const minimumNextBidSol = Number((Math.max(currentBidSol, estimateLowSol) + 0.2).toFixed(1));

  return {
    ...artwork,
    lotNumber: index + 1,
    saleId: sale.id,
    estimateLowSol,
    estimateHighSol,
    reserveSol: estimateLowSol,
    currentBidSol,
    minimumNextBidSol,
    bidCount: index % 3 === 0 ? 7 + index : index + 1,
    watchCount: 34 + index * 11,
    status: sale.status === "closed" ? "sold" : sale.status === "live" ? "live" : "upcoming",
    closesAt: sale.closesAt,
    conditionReport:
      "Digital file reviewed for collector display quality and human authorship. Evidence packet includes process artifacts and reviewer notes; physical condition is not applicable unless a print addendum is issued.",
    provenanceStatement:
      "Consigned directly by the human artist to HUMAN_ Arts. Off-chain editorial data is cached in Supabase; ownership and settlement are intended to resolve on Solana.",
    authenticityStatement:
      "Artist attestation, human-authorship evidence, no-AI review, and curatorial notes are separated from platform-written catalog text for collector clarity.",
    buyerPremiumBps: 800,
    platformSellerCommissionBps: 700,
  };
});

const creators: CreatorRecord[] = [
  {
    wallet: "creative-soul",
    name: "Mina Sol",
    handle: "@creative.soul",
    location: "Lisbon, Portugal",
    discipline: "Painterly digital environments",
    bio: "Mina builds luminous, hand-crafted digital paintings rooted in physical texture studies and archival color references.",
    heroStatement: "Every published work ships with enough human-authorship evidence for collectors to understand how it was made, not just how it looks.",
    artworkIds: ["c42262a7-f850-44bc-ad07-6df576d05979"],
  },
  {
    wallet: "visual-artist",
    name: "Ari Vega",
    handle: "@visual.artist",
    location: "Mexico City, Mexico",
    discipline: "3D atmosphere and cinematic light",
    bio: "Ari designs worlds that feel both architectural and emotional, using custom lighting passes instead of one-click generators.",
    heroStatement: "Collectors should be able to trace human intent, revisions, and authorship without digging through developer tooling.",
    artworkIds: ["c42262a7-f850-44bc-ad07-6df576d05979"],
  },
  {
    wallet: "studio-collective",
    name: "Studio Parcel",
    handle: "@studio.collective",
    location: "Seoul, South Korea",
    discipline: "Curated generative systems",
    bio: "Studio Parcel treats code as a studio material, combining authored rule sets with human review and curation.",
    heroStatement: "Code-based art can be transparent, collector-friendly, and deeply human when process is designed with evidence in mind.",
    artworkIds: ["c42262a7-f850-44bc-ad07-6df576d05979"],
  },
];

function titleFromId(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fallbackArtwork(id: string): AuctionLotRecord {
  return {
    id,
    title: titleFromId(id),
    artistName: "HUMAN_ Featured Artist",
    artistHandle: "@human.verified",
    artistWallet: "creative-soul",
    priceSol: 4.2,
    category: "Digital Art",
    medium: "Human-authored mixed workflow",
    edition: "Collector drop",
    year: 2026,
    description: "A curated artwork record prepared for the HUMAN_ auction-house experience.",
    story: "This placeholder route is still backed by the finished catalog shell so collectors can explore without a dead-end page.",
    collectorNote: "Evidence references and review notes are shown in the product surface for continuity.",
    availability: "Available on request",
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(124, 58, 237, 0.68), rgba(212, 175, 55, 0.18))",
    accent: "#d4af37",
    evidenceLabels: ["Artist attestation", "Evidence packet", "No-AI review log"],
    lotNumber: 99,
    saleId: "contemporary-digital-asia",
    estimateLowSol: 3.2,
    estimateHighSol: 5.6,
    reserveSol: 3.2,
    currentBidSol: 0,
    minimumNextBidSol: 3.2,
    bidCount: 0,
    watchCount: 12,
    status: "upcoming",
    closesAt: "2026-05-15T14:00:00.000Z",
    conditionReport: "Fallback catalog entry prepared for route continuity and human-authorship review.",
    provenanceStatement: "Consigned directly by the artist with platform-reviewed human provenance pending.",
    authenticityStatement: "Artist attestation and reviewer evidence are displayed separately when available; AI-generated or AI-assisted work is not accepted.",
    buyerPremiumBps: 800,
    platformSellerCommissionBps: 700,
  };
}

export async function getFeaturedArtworks() {
  const data = await listArtworks(6);
  return data.length > 0 ? data : artworks;
}

export async function getFeaturedArtwork() {
  const data = await listArtworks(1);
  return data.length > 0 ? data[0] : artworks[0];
}

export async function getArtworkById(id: string) {
  const data = await getSupabaseArtworkById(id);
  if (data) return data as AuctionLotRecord;
  return artworks.find((artwork) => artwork.id === id) ?? fallbackArtwork(id);
}

export async function getCreators() {
  const data = await listCreators();
  return data.length > 0 ? data : creators;
}

export async function getCreatorByWallet(wallet: string) {
  const data = await getSupabaseCreatorByWallet(wallet);
  if (data) return data as CreatorRecord;
  return creators.find((creator) => creator.wallet === wallet) ?? null;
}

export async function getCreatorArtworks(wallet: string) {
  const creator = await getCreatorByWallet(wallet);
  if (!creator) return [];
  const artworks = await listArtworks();
  return artworks.filter(a => a.artist_wallet === wallet);
}

export async function getAuctionSales() {
  const data = await listSales();
  return data.length > 0 ? data : auctionSales;
}

export async function getAuctionSaleById(id: string) {
  const data = await getSupabaseSaleById(id);
  if (data) return data as AuctionSaleRecord;
  return auctionSales.find((sale) => sale.id === id) ?? null;
}

export async function getAuctionLotsBySaleId(saleId: string) {
  const artworks = await listArtworks();
  return artworks.filter(lot => lot.sale_id === saleId) as AuctionLotRecord[];
}

export async function getAuctionLotById(lotId: string) {
  const data = await getSupabaseArtworkById(lotId);
  if (data) return data as AuctionLotRecord;
  return artworks.find((lot) => lot.id === lotId) ?? null;
}

export async function getSaleForLot(lotId: string) {
  const lot = await getAuctionLotById(lotId);
  return lot && lot.sale_id ? getAuctionSaleById(lot.sale_id) : null;
}
