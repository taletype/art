import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    ok: false, 
    message: "Mint API deprecated - use thirdweb SDK" 
  }, { status: 501 });
}
