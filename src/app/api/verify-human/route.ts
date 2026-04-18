import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getProvenanceBadgeState,
  requiresMoreEvidence,
  verifyProvenancePayloadSchema,
} from "../../../lib/provenance";

export async function POST(request: Request) {
  try {
    const parsed = verifyProvenancePayloadSchema.parse(await request.json());
    const evidenceCheck = requiresMoreEvidence(parsed.provenance);

    const verificationStatus = parsed.forceStatus ?? parsed.provenance.verificationStatus;

    return NextResponse.json({
      ok: true,
      verificationStatus,
      badgeState: getProvenanceBadgeState(parsed.provenance),
      evidenceCheck,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { ok: false, message: "Invalid provenance payload", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown verification error",
      },
      { status: 500 },
    );
  }
}
