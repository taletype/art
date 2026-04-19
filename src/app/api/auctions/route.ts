import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Supabase auction APIs are now legacy. Read live listings from the configured Thirdweb marketplace." },
    { status: 410 },
  );
}

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Seller listing creation now happens through the Thirdweb marketplace flow in Seller Hub." },
    { status: 410 },
  );
}
