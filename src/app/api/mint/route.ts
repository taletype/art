import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getAuthenticatedAppUser,
  requireAuthenticatedAppUserResponse,
  requireLinkedWalletResponse,
  resolveMatchingSellerWallet,
} from "@/lib/auth";
import { createSellerArtwork, prepareArtworkMintForSolanaDevnet } from "@/lib/seller";
import { createSellerArtworkSchema, prepareArtworkSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();
  if (!user) {
    return requireAuthenticatedAppUserResponse();
  }

  try {
    const body = await request.json();

    if ("artworkId" in body) {
      const payload = prepareArtworkSchema.parse(body);
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
    }

    if (!user.walletAddress) {
      return requireLinkedWalletResponse();
    }

    const payload = createSellerArtworkSchema.parse(body);
    const artwork = await createSellerArtwork({
      ownerUserId: user.id,
      sellerWallet: user.walletAddress,
      title: payload.title,
      description: payload.description,
      imageUrl: payload.imageUrl,
      medium: payload.medium,
      category: payload.category,
      provenanceText: payload.provenanceText,
      reservePriceLamports: payload.reservePriceLamports,
    });

    return NextResponse.json({ ok: true, artwork }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid seller payload", issues: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to create or prepare artwork" },
      { status: 500 },
    );
  }
}
