import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getAuthenticatedAppUser,
  requireAuthenticatedAppUserResponse,
  requireLinkedWalletResponse,
} from "@/lib/auth";
import { createSellerArtwork } from "@/lib/seller";
import { createSellerArtworkSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();
  if (!user) {
    return requireAuthenticatedAppUserResponse();
  }

  try {
    const body = await request.json();
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
      priceEth: payload.priceEth,
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
