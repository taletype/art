import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { closeAuctionForUser, getAuthenticatedAuctionUserFromRequest } from "@/lib/auction-v1";
import { auctionCloseSchema } from "@/lib/validators";

type AuctionCloseRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: AuctionCloseRouteProps) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedAuctionUserFromRequest(request);
    const payload = auctionCloseSchema.parse(await request.json().catch(() => ({})));
    const auction = await closeAuctionForUser(id, user, payload);
    return NextResponse.json({ ok: true, auction });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid close payload.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to close auction." },
      { status: 400 },
    );
  }
}
