import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getAuthenticatedAppUser,
  requireAuthenticatedAppUserResponse,
  requireLinkedWalletResponse,
  resolveMatchingSellerWallet,
} from "@/lib/auth";
import { finalizeArtworkMintForSolanaDevnet } from "@/lib/seller";
import { finalizeArtworkMintSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();
  if (!user) {
    return requireAuthenticatedAppUserResponse();
  }

  try {
    const payload = finalizeArtworkMintSchema.parse(await request.json());
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

    const artwork = await finalizeArtworkMintForSolanaDevnet({
      artworkId: payload.artworkId,
      ownerUserId: user.id,
      sellerWallet: sellerWallet.wallet,
      txSignature: payload.txSignature,
      mintAddress: payload.mintAddress,
      metadataAddress: payload.metadataAddress,
      tokenAccountAddress: payload.tokenAccountAddress,
      recentBlockhash: payload.recentBlockhash,
      lastValidBlockHeight: payload.lastValidBlockHeight,
    });

    return NextResponse.json({ ok: true, artwork });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid mint finalize payload", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to finalize Solana mint" },
      { status: 500 },
    );
  }
}
