import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    ok: false, 
    message: "List API deprecated - use thirdweb SDK for listings" 
  }, { status: 501 });
}
