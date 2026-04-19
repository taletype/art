import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";
import { getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { mintTo, nextTokenIdToMint, setApprovalForAll } from "thirdweb/extensions/erc721";
import { createAuction } from "thirdweb/extensions/marketplace";
import { privateKeyToAccount } from "thirdweb/wallets";
import { sendAndConfirmTransaction } from "thirdweb";

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT;
const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT;
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const SECRET_KEY = process.env.THIRDWEB_SECRET_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, imageUrl, startPrice } = body;

    if (!title || !description || !imageUrl || !startPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = createThirdwebClient({ clientId: CLIENT_ID, secretKey: SECRET_KEY });
    const account = privateKeyToAccount({ privateKey: PRIVATE_KEY, client });

    const marketplaceContract = getContract({
      client,
      chain: baseSepolia,
      address: MARKETPLACE_ADDRESS!,
    });

    const collectionContract = getContract({
      client,
      chain: baseSepolia,
      address: COLLECTION_ADDRESS!,
    });

    // Approve marketplace
    try {
      const approvalTx = setApprovalForAll({
        contract: collectionContract,
        operator: MARKETPLACE_ADDRESS!,
        approved: true,
      });
      const approvalReceipt = await sendAndConfirmTransaction({
        transaction: approvalTx,
        account,
      });
      console.log("Approval sent:", approvalReceipt.transactionHash);
    } catch (error) {
      console.log("Approval error (may already be set):", (error as Error).message);
    }

    // Get next token ID
    const nextTokenId = await nextTokenIdToMint({ contract: collectionContract });

    // Mint
    const mintTx = mintTo({
      contract: collectionContract,
      to: account.address,
      nft: {
        name: title,
        description,
        image: imageUrl,
      },
    });
    const mintReceipt = await sendAndConfirmTransaction({
      transaction: mintTx,
      account,
    });

    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create auction
    const auctionTx = createAuction({
      contract: marketplaceContract,
      assetContractAddress: COLLECTION_ADDRESS!,
      tokenId: nextTokenId,
      minimumBidAmount: startPrice.toFixed(4),
      buyoutBidAmount: (startPrice * 2).toFixed(4),
      endTimestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const auctionReceipt = await sendAndConfirmTransaction({
      transaction: auctionTx,
      account,
    });

    return NextResponse.json({
      success: true,
      tokenId: nextTokenId.toString(),
      mintHash: mintReceipt.transactionHash,
      auctionHash: auctionReceipt.transactionHash,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
