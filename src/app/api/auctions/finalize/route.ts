import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Solana auction finalization is legacy. Use the live Thirdweb marketplace flow in Seller Hub." },
    { status: 410 },
  );
}
