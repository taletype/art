import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedAppUser, requireAuthenticatedAppUserResponse, requireLinkedWalletResponse } from "@/lib/auth";
import { createSellerArtwork, prepareArtworkWithThirdweb } from "@/lib/seller";
import { createSellerArtworkSchema, prepareArtworkSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();
  if (!user) {
    return requireAuthenticatedAppUserResponse();
  }
  if (!user.walletAddress) {
    return requireLinkedWalletResponse();
  }

  try {
    const body = await request.json();

    if ("artworkId" in body) {
      const payload = prepareArtworkSchema.parse(body);
      const artwork = await prepareArtworkWithThirdweb(payload.artworkId, user.id);
      return NextResponse.json({ ok: true, artwork });
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
