import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedAuctionUserFromRequest, placeBidForUser } from "@/lib/auction-v1";
import { auctionBidSchema } from "@/lib/validators";

type AuctionBidRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: AuctionBidRouteProps) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedAuctionUserFromRequest(request);
    const payload = auctionBidSchema.parse(await request.json());
    const auction = await placeBidForUser(id, user, payload);
    return NextResponse.json({ ok: true, auction });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok: false, message: "Invalid bid payload.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to place bid." },
      { status: 400 },
    );
  }
}
