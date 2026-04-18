import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    ok: false, 
    message: "Thirdweb webhook deprecated - purchase state removed" 
  }, { status: 501 });
}
