import { NextResponse } from "next/server";

const RETIRED_PURCHASE_MESSAGE = "Purchase API deprecated - use thirdweb SDK for purchases";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: RETIRED_PURCHASE_MESSAGE,
    },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message: RETIRED_PURCHASE_MESSAGE,
    },
    { status: 410 },
  );
}
