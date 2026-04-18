import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createAuctionForUser, getAuthenticatedAuctionUserFromRequest, listAuctions } from "@/lib/auction-v1";
import { auctionCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as "all" | "draft" | "live" | "ended" | "settled" | "cancelled" | null;
    const auctions = await listAuctions({ status: status ?? "all" });
    return NextResponse.json({ ok: true, auctions });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load auctions." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedAuctionUserFromRequest(request);
    const payload = auctionCreateSchema.parse(await request.json());
    const auction = await createAuctionForUser(user, payload);
    return NextResponse.json({ ok: true, auction }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid auction payload.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to create auction." },
      { status: 400 },
    );
  }
}
