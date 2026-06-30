import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Thirdweb webhook handling is inactive; purchase state is handled by live marketplace flows.",
    },
    { status: 501 },
  );
}
