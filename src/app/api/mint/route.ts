import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedAppUser } from "@/lib/auth";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { createSellerArtwork } from "@/lib/seller";
import { createSellerArtworkSchema } from "@/types/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();

  try {
    const body = await request.json();
    const payload = createSellerArtworkSchema.parse(body);
    const sellerWallet = user?.walletAddress ?? payload.sellerWallet ?? null;
    if (!sellerWallet || !isValidEvmAddress(sellerWallet)) {
      return NextResponse.json(
        { ok: false, message: "Connect a Thirdweb wallet or sign in with a profile wallet before minting." },
        { status: 401 },
      );
    }

    const artwork = await createSellerArtwork({
      ownerUserId: user?.id ?? null,
      sellerWallet,
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
