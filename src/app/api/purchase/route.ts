import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    ok: false, 
    message: "Purchase API deprecated - use thirdweb SDK for purchases" 
  }, { status: 501 });
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    ok: false, 
    message: "Purchase API deprecated - use thirdweb SDK for purchases" 
  }, { status: 501 });
}
