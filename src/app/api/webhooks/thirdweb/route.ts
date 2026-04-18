import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "TODO: verify Thirdweb webhook and update funding state",
  });
}
