import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAppUser, requireAuthenticatedAppUserResponse, requireLinkedWalletResponse } from "@/lib/auth";
import { prepareArtworkWithThirdweb } from "@/lib/seller";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedAppUser();
  if (!user) {
    return requireAuthenticatedAppUserResponse();
  }
  if (!user.walletAddress) {
    return requireLinkedWalletResponse();
  }

  const body = await request.json();
  if (!body?.artworkId) {
    return NextResponse.json({ ok: false, message: "artworkId is required" }, { status: 400 });
  }

  try {
    const artwork = await prepareArtworkWithThirdweb(body.artworkId, user.id);
    return NextResponse.json({ ok: true, artwork });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to prepare listing" },
      { status: 500 },
    );
  }
}
