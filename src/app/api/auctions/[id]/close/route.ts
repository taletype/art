import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Legacy off-chain auction closing is disabled. Auction settlement now follows the live Thirdweb marketplace contract." },
    { status: 410 },
  );
}
