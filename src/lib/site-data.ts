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
  { label: "Verified creator drops", value: "128+" },
  { label: "Evidence packets reviewed", value: "1.9k" },
  { label: "Average settlement time", value: "< 30s" },
];

export const trustSignals = [
  {
    label: "Human-made provenance",
    description: "Every listing pairs collector-facing artwork with creator evidence and reviewer attestations.",
  },
  {
    label: "Solana-native checkout",
    description: "Fast, low-cost purchase preparation with durable purchase state and RPC confirmation.",
  },
  {
    label: "Creator-first curation",
    description: "Submission, review, minting, and listing live in one connected workflow.",
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
    story: "The scene was assembled from custom topology sketches and hand-tuned lighting passes rather than AI-generated geometry.",
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
    description: "A faceted field of mirrored structures shaped by a creator-authored geometry engine.",
    story: "Every release candidate is reviewed against the saved process packet to preserve authorship and consistency.",
    collectorNote: "Collector access includes the provenance summary and signed review outcome.",
    availability: "Mint window open",
    background: "linear-gradient(135deg, rgba(14, 116, 144, 0.95), rgba(59, 130, 246, 0.68), rgba(191, 219, 254, 0.2))",
    accent: "#93c5fd",
    evidenceLabels: ["Parameter pack", "Session notes", "Signed review"],
  },
];

const creators: CreatorRecord[] = [
  {
    wallet: "creative-soul",
    name: "Mina Sol",
    handle: "@creative.soul",
    location: "Lisbon, Portugal",
    discipline: "Painterly digital environments",
    bio: "Mina builds luminous, hand-crafted digital paintings rooted in physical texture studies and archival color references.",
    heroStatement: "Every published work ships with enough process evidence for collectors to understand how it was made, not just how it looks.",
    artworkIds: ["ethereal-waves", "chromatic-fusion"],
  },
  {
    wallet: "visual-artist",
    name: "Ari Vega",
    handle: "@visual.artist",
    location: "Mexico City, Mexico",
    discipline: "3D atmosphere and cinematic light",
    bio: "Ari designs worlds that feel both architectural and emotional, using custom lighting passes instead of one-click generators.",
    heroStatement: "Collectors should be able to trace intent, revisions, and authorship without digging through developer tooling.",
    artworkIds: ["neon-landscapes", "quantum-dreams"],
  },
  {
    wallet: "studio-collective",
    name: "Studio Parcel",
    handle: "@studio.collective",
    location: "Seoul, South Korea",
    discipline: "Curated generative systems",
    bio: "Studio Parcel treats code as a studio material, combining authored rule sets with human review and curation.",
    heroStatement: "Generative art can be transparent, collector-friendly, and deeply human when process is designed with evidence in mind.",
    artworkIds: ["abstract-dimensions", "crystalline-forms"],
  },
];

function titleFromId(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function fallbackArtwork(id: string): ArtworkRecord {
  return {
    id,
    title: titleFromId(id),
    artistName: "HUMAN_ Featured Creator",
    artistHandle: "@human.verified",
    artistWallet: "creative-soul",
    priceSol: 4.2,
    category: "Digital Art",
    medium: "Creator-authored mixed workflow",
    edition: "Collector drop",
    year: 2026,
    description: "A curated artwork record prepared for the HUMAN_ marketplace experience.",
    story: "This placeholder route is still backed by the finished UI shell so collectors can explore without a dead-end page.",
    collectorNote: "Evidence references and review notes are shown in the product surface for continuity.",
    availability: "Available on request",
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(124, 58, 237, 0.68), rgba(212, 175, 55, 0.18))",
    accent: "#d4af37",
    evidenceLabels: ["Creator attestation", "Evidence packet", "Review log"],
  };
}

export function getFeaturedArtworks() {
  return artworks;
}

export function getFeaturedArtwork() {
  return artworks[0];
}

export function getArtworkById(id: string) {
  return artworks.find((artwork) => artwork.id === id) ?? fallbackArtwork(id);
}

export function getCreators() {
  return creators;
}

export function getCreatorByWallet(wallet: string) {
  return creators.find((creator) => creator.wallet === wallet) ?? null;
}

export function getCreatorArtworks(wallet: string) {
  const creator = getCreatorByWallet(wallet);
  if (!creator) return [];
  return creator.artworkIds.map((id) => getArtworkById(id));
}
