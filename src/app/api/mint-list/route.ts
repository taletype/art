import { NextResponse } from "next/server";

const RETIRED_MINT_LIST_MESSAGE =
  "Server-side mint/list API is retired. Use Seller Hub wallet-signed minting and marketplace listing instead.";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: RETIRED_MINT_LIST_MESSAGE,
    },
    { status: 410 },
  );
}
