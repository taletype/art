import { createArtwork } from '../src/lib/supabase-db.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedArtwork() {
  try {
    const artwork = await createArtwork({
      title: "Digital Sunset #001",
      artist_name: "Alex Chen",
      artist_handle: "alexchen",
      artist_wallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      price_sol: 2.5,
      category: "visual",
      medium: "digital painting",
      edition: "1 of 1",
      year: 2024,
      description: "A stunning digital sunset captured in vibrant colors, representing the transition from day to night in the digital age.",
      story: "Created during a moment of reflection on how technology changes our perception of natural phenomena.",
      collector_note: "Original digital artwork with full provenance documentation.",
      availability: "available",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      accent: "#f5d76a",
      evidence_labels: ["human-created", "original", "provenance-verified"],
      status: "upcoming",
      estimate_low_sol: 2.0,
      estimate_high_sol: 3.0,
      reserve_sol: 2.0,
      bid_count: 0,
      watch_count: 0,
      condition_report: "Excellent condition, no defects detected.",
      provenance_statement: "Consigned directly by the artist with platform-reviewed human provenance.",
      authenticity_statement: "Artist attestation and reviewer evidence available. AI-generated or AI-assisted work is not accepted.",
      buyer_premium_bps: 800,
      platform_seller_commission_bps: 700,
    });

    console.log('Artwork seeded successfully:', artwork);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding artwork:', error);
    process.exit(1);
  }
}

seedArtwork();
