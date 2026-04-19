import { config } from "dotenv";
config({ path: ".env.local" });

import { createThirdwebClient } from "thirdweb";
import { getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { mintTo, nextTokenIdToMint, setApprovalForAll } from "thirdweb/extensions/erc721";
import { createAuction, createListing } from "thirdweb/extensions/marketplace";
import { privateKeyToAccount } from "thirdweb/wallets";
import { prepareTransaction, sendTransaction } from "thirdweb";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const PRIVATE_KEY = "0xb80e51c61ea3123939c785f77dfa9cd77518413a7eb232534504d47dbdef83c0";
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT;
const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT;
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Function to download image from URL
async function downloadImage(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  return { buffer, contentType };
}

// Function to create bucket if it doesn't exist
async function ensureBucketExists(bucketName) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating bucket '${bucketName}'...`);
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });
      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      console.log(`✅ Bucket '${bucketName}' created`);
    }
  } catch (error) {
    console.error(`Error ensuring bucket exists: ${error.message}`);
    throw error;
  }
}

// Function to upload image to Supabase storage
async function uploadToSupabase(buffer, contentType, filename) {
  const { data, error } = await supabase.storage
    .from('artworks')
    .upload(filename, buffer, {
      contentType,
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('artworks')
    .getPublicUrl(filename);

  return publicUrl;
}

if (!PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY or THIRDWEB_SECRET_KEY environment variable");
  process.exit(1);
}

if (!MARKETPLACE_ADDRESS) {
  console.error("Missing NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT environment variable");
  process.exit(1);
}

if (!COLLECTION_ADDRESS) {
  console.error("Missing NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT environment variable");
  process.exit(1);
}

if (!CLIENT_ID) {
  console.error("Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable");
  process.exit(1);
}

// Create client and account
const client = createThirdwebClient({
  clientId: CLIENT_ID,
});

const account = privateKeyToAccount({ privateKey: PRIVATE_KEY });

// Get contracts
const marketplaceContract = getContract({
  client,
  chain: baseSepolia,
  address: MARKETPLACE_ADDRESS,
});

const collectionContract = getContract({
  client,
  chain: baseSepolia,
  address: COLLECTION_ADDRESS,
});

// Sample artworks to mint and list
const artworks = [
  {
    name: "Nocturne for Harbour Light",
    description: "A moody waterfront study exploring the interplay of light and shadow in urban harbor scenes.",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80",
    startPrice: 0.05,
  },
  {
    name: "Threads of the New Market",
    description: "An abstract textile-inspired piece examining the patterns of modern commerce and connection.",
    image: "https://images.unsplash.com/photo-1577083552431-6e5fd75fcfb1?auto=format&fit=crop&w=1200&q=80",
    startPrice: 0.03,
  },
  {
    name: "Portrait of a Quiet Interval",
    description: "A contemplative portrait capturing the stillness between moments of activity and reflection.",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
    startPrice: 0.08,
  },
  {
    name: "Digital Horizons",
    description: "A futuristic landscape exploring the boundaries between physical and digital realms.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
    startPrice: 0.04,
  },
  {
    name: "Chromatic Dreams",
    description: "A vibrant exploration of color theory through abstract geometric compositions.",
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=80",
    startPrice: 0.06,
  },
  {
    name: "Ethereal Networks",
    description: "A visualization of interconnected systems and the flow of information in the digital age.",
    image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=1200&q=80",
    startPrice: 0.07,
  },
];

async function main() {
  console.log("Seeding Base Sepolia auctions...");
  console.log(`Marketplace: ${MARKETPLACE_ADDRESS}`);
  console.log(`Collection: ${COLLECTION_ADDRESS}`);
  console.log(`Account: ${account.address}\n`);

  // Ensure Supabase bucket exists
  console.log("Checking Supabase storage bucket...");
  await ensureBucketExists('artworks');

  // Approve marketplace to transfer all NFTs
  console.log("Approving marketplace contract...");
  try {
    const approvalReceipt = await setApprovalForAll({
      contract: collectionContract,
      operator: MARKETPLACE_ADDRESS,
      approved: true,
      account,
    });
    console.log("✅ Approval transaction sent:", approvalReceipt.transactionHash);
  } catch (error) {
    console.error("Error sending approval:", error.message);
    console.log("Continuing with minting (approval may already be set)...\n");
  }

  // Mint and list each artwork
  for (let i = 0; i < artworks.length; i++) {
    const artwork = artworks[i];
    console.log(`\n--- Processing artwork ${i + 1}/${artworks.length}: ${artwork.name} ---`);

    try {
      // Download and upload image to Supabase
      console.log("Downloading image from Unsplash...");
      const { buffer, contentType } = await downloadImage(artwork.image);
      
      console.log("Uploading image to Supabase...");
      const filename = `${artwork.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.jpg`;
      const supabaseUrl = await uploadToSupabase(buffer, contentType, filename);
      console.log(`✅ Image uploaded to Supabase: ${supabaseUrl}`);

      // Get next token ID
      const nextTokenId = await nextTokenIdToMint({ contract: collectionContract });
      console.log(`Next token ID: ${nextTokenId}`);

      // Mint the artwork
      console.log("Minting artwork...");
      const mintReceipt = await mintTo({
        contract: collectionContract,
        to: account.address,
        nft: {
          name: artwork.name,
          description: artwork.description,
          image: supabaseUrl,
        },
        account,
      });
      console.log(`✅ Minted token ${nextTokenId}:`, mintReceipt.transactionHash);

      // Wait a bit for the mint to be confirmed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create auction listing
      console.log("Creating auction listing...");
      const auctionReceipt = await createAuction({
        contract: marketplaceContract,
        assetContractAddress: COLLECTION_ADDRESS,
        tokenId: nextTokenId,
        minimumBidAmount: artwork.startPrice.toFixed(4),
        buyoutBidAmount: (artwork.startPrice * 2).toFixed(4),
        endTimestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        account,
      });
      console.log(`✅ Auction created:`, auctionReceipt.transactionHash);
      console.log(`   Minimum bid: ${artwork.startPrice.toFixed(4)} ETH`);
      console.log(`   Buyout: ${(artwork.startPrice * 2).toFixed(4)} ETH`);

    } catch (error) {
      console.error(`Error processing ${artwork.name}:`, error.message);
    }
  }

  console.log("\n✅ Seed script completed! All transactions sent.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
