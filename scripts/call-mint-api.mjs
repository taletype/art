import { config } from "dotenv";
config({ path: ".env.local" });

const artworks = [
  {
    name: "Nocturne for Harbour Light",
    description: "A contemplative portrait capturing the stillness between dusk and dawn, where light meets water in quiet harmony.",
    image: "https://oouysduliijrgvegrnya.supabase.co/storage/v1/object/public/artworks/nocturne-for-harbour-light-1776585408950.jpg",
    startPrice: 0.05
  },
  {
    name: "Portrait of a Quiet Interval",
    description: "A contemplative portrait capturing the stillness between dusk and dawn, where light meets water in quiet harmony.",
    image: "https://oouysduliijrgvegrnya.supabase.co/storage/v1/object/public/artworks/portrait-of-a-quiet-interval-1776585411519.jpg",
    startPrice: 0.08
  },
  {
    name: "Digital Horizons",
    description: "A futuristic landscape exploring the boundaries between physical and digital realms, where imagination meets technology.",
    image: "https://oouysduliijrgvegrnya.supabase.co/storage/v1/object/public/artworks/digital-horizons-1776585413591.jpg",
    startPrice: 0.04
  },
  {
    name: "Chromatic Dreams",
    description: "A vibrant exploration of color theory through abstract compositions, where emotion is expressed through hue and saturation.",
    image: "https://oouysduliijrgvegrnya.supabase.co/storage/v1/object/public/artworks/chromatic-dreams-1776585415845.jpg",
    startPrice: 0.06
  },
  {
    name: "Ethereal Networks",
    description: "A visualization of interconnected systems and the flow of information in the digital age.",
    image: "https://oouysduliijrgvegrnya.supabase.co/storage/v1/object/public/artworks/ethereal-networks-1776585417839.jpg",
    startPrice: 0.07
  }
];

async function callMintAPI(artwork) {
  try {
    const response = await fetch('http://localhost:3000/api/mint-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: artwork.name,
        description: artwork.description,
        imageUrl: artwork.image,
        startPrice: artwork.startPrice
      })
    });

    const data = await response.json();
    console.log(`✅ ${artwork.name}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ ${artwork.name}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('Calling mint-list API for each artwork...\n');

  for (const artwork of artworks) {
    console.log(`Processing: ${artwork.name}`);
    await callMintAPI(artwork);
    console.log();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between requests
  }

  console.log('✅ All artworks processed!');
}

main().catch(console.error);
