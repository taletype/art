import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Solana mint finalization is legacy. Mint directly through the Thirdweb collection flow in Seller Hub." },
    { status: 410 },
  );
}
