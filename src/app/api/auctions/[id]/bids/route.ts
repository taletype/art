import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Legacy off-chain bid writes are disabled. Use the live Thirdweb marketplace listing page to place bids." },
    { status: 410 },
  );
}
