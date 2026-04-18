import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedAuctionUserFromRequest, settleAuctionForUser } from "@/lib/auction-v1";
import { auctionSettlementSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedAuctionUserFromRequest(request);
    const payload = auctionSettlementSchema.parse(await request.json());
    const settlement = await settleAuctionForUser(user, payload);
    return NextResponse.json({ ok: true, settlement });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid settlement payload.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to settle auction." },
      { status: 400 },
    );
  }
}
