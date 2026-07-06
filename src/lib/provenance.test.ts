import { describe, expect, it } from "vitest";
import {
  getHumanMadePolicyFailureReason,
  getProvenanceBadgeState,
  requiresMoreEvidence,
  verifyProvenancePayloadSchema,
} from "@/lib/provenance";
import type { Provenance } from "@/types/provenance";

function makeProvenance(overrides: Partial<Provenance> = {}): Provenance {
  const evidence = [
    {
      kind: "source_file" as const,
      hash: "a".repeat(64),
      label: "Source file hash",
    },
  ];

  return {
    category: "visual",
    medium: "digital painting",
    creationMethod: "HUMAN_ORIGINAL",
    attestation: {
      text: "I certify this artwork is human-created, not AI-generated or AI-assisted.",
      signerWallet: "0x1234567890abcdef1234567890abcdef12345678",
      timestamp: "2026-01-01T00:00:00.000Z",
      signatureRef: "signature-reference",
    },
    evidence,
    evidenceHashes: evidence.map((item) => item.hash),
    verificationStatus: "PENDING_REVIEW",
    ...overrides,
  };
}

describe("provenance badge state", () => {
  it("marks pending packets without evidence as needing evidence", () => {
    const provenance = makeProvenance({ evidence: [], evidenceHashes: [] });

    expect(getProvenanceBadgeState(provenance)).toBe("needs_evidence");
    expect(requiresMoreEvidence(provenance)).toContain("At least one evidence hash is required");
    expect(getHumanMadePolicyFailureReason(provenance)).toBe(
      "No evidence hashes provided. Add at least one source artifact or process capture.",
    );
  });

  it("keeps reviewed terminal states ahead of missing evidence display", () => {
    expect(
      getProvenanceBadgeState(
        makeProvenance({ evidence: [], evidenceHashes: [], verificationStatus: "REJECTED", rejectionReason: "AI-assisted final artwork" }),
      ),
    ).toBe("rejected");

    expect(
      getProvenanceBadgeState(
        makeProvenance({
          evidence: [],
          evidenceHashes: [],
          verificationStatus: "VERIFIED_HUMAN",
          reviewerDecision: {
            reviewerWallet: "0x1234567890abcdef1234567890abcdef12345678",
            decidedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      ),
    ).toBe("verified");
  });
});

describe("verifyProvenancePayloadSchema", () => {
  it("rejects evidence entries without a usable hash", () => {
    const provenance = makeProvenance({
      evidence: [
        {
          kind: "source_file",
          hash: "   ",
          label: "Source file hash",
        },
      ],
      evidenceHashes: ["   "],
    });

    const parsed = verifyProvenancePayloadSchema.safeParse({ provenance });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain("provenance.evidence.0.hash");
    }
  });

  it("rejects unsupported evidence kinds", () => {
    const provenance = {
      ...makeProvenance(),
      evidence: [
        {
          kind: "ai_prompt",
          hash: "a".repeat(64),
          label: "Prompt transcript",
        },
      ],
    };

    const parsed = verifyProvenancePayloadSchema.safeParse({ provenance });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toContain("provenance.evidence.0.kind");
    }
  });

  it("trims evidence hashes before verification handling", () => {
    const hash = "a".repeat(64);
    const provenance = makeProvenance({
      evidence: [
        {
          kind: "source_file",
          hash: ` ${hash} `,
          label: "Source file hash",
        },
      ],
      evidenceHashes: [` ${hash} `],
    });

    const parsed = verifyProvenancePayloadSchema.parse({ provenance });

    expect(parsed.provenance.evidence[0].hash).toBe(hash);
  });
});