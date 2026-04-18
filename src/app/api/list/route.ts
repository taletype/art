import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedAppUser,
  requireAuthenticatedAppUserResponse,
  requireLinkedWalletResponse,
  resolveMatchingSellerWallet,
} from "@/lib/auth";
import { prepareArtworkMintForSolanaDevnet } from "@/lib/seller";
import { prepareArtworkSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();
  if (!user) {
    return requireAuthenticatedAppUserResponse();
  }

  try {
    const payload = prepareArtworkSchema.parse(await request.json());
    const sellerWallet = resolveMatchingSellerWallet({
      profileWalletAddress: user.walletAddress,
      requestWalletAddress: payload.sellerWallet,
    });
    if (sellerWallet.mismatch) {
      return NextResponse.json(
        { ok: false, message: "Connect the same Solana wallet that is saved on your seller profile before signing." },
        { status: 400 },
      );
    }
    if (!sellerWallet.wallet) {
      return requireLinkedWalletResponse();
    }

    const prepared = await prepareArtworkMintForSolanaDevnet(payload.artworkId, user.id, sellerWallet.wallet);
    return NextResponse.json(prepared);
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to prepare listing" },
      { status: 500 },
    );
  }
}
