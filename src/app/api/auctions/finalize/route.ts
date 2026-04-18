import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getAuthenticatedAppUser,
  requireAuthenticatedAppUserResponse,
  requireLinkedWalletResponse,
  resolveMatchingSellerWallet,
} from "@/lib/auth";
import { finalizeSellerAuction } from "@/lib/seller";
import { finalizeSellerAuctionSchema } from "@/types/seller";

export async function POST(request: Request) {
  const sessionUser = await getAuthenticatedAppUser();
  if (!sessionUser) {
    return requireAuthenticatedAppUserResponse();
  }

  try {
    const payload = finalizeSellerAuctionSchema.parse(await request.json());
    const sellerWallet = resolveMatchingSellerWallet({
      profileWalletAddress: sessionUser.walletAddress,
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

    const auction = await finalizeSellerAuction({
      artworkId: payload.artworkId,
      ownerUserId: sessionUser.id,
      sellerWallet: sellerWallet.wallet,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      startPriceLamports: payload.startPriceLamports,
      minIncrementLamports: payload.minIncrementLamports,
      txSignature: payload.txSignature,
      listingAddress: payload.listingAddress,
      mintAddress: payload.mintAddress,
      recentBlockhash: payload.recentBlockhash,
      lastValidBlockHeight: payload.lastValidBlockHeight,
    });

    return NextResponse.json({ ok: true, auction }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, message: "Invalid seller auction finalize payload", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to finalize auction" },
      { status: 500 },
    );
  }
}
