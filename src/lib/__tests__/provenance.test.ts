import { describe, expect, it } from "vitest";
import {
  canListAsset,
  getProvenanceBadgeState,
  requiresMoreEvidence,
  validateProvenance,
} from "../provenance";

const base = {
  category: "visual",
  medium: "ink",
  creationMethod: "HUMAN_ORIGINAL",
  attestation: {
    text: "I certify this work is human-created and follows HUMAN_ policy.",
    signerWallet: "ArtistWallet1111111111111111111111111111111",
    timestamp: new Date().toISOString(),
    signatureRef: "sig-ref-123456",
  },
  evidence: [
    { kind: "source_file", hash: "a".repeat(64), label: "source" },
    { kind: "wip_image", hash: "b".repeat(64), label: "wip" },
  ],
  evidenceHashes: ["a".repeat(64), "b".repeat(64)],
  verificationStatus: "VERIFIED_HUMAN",
  reviewerDecision: {
    reviewerWallet: "ReviewerWallet111111111111111111111111111",
    decidedAt: new Date().toISOString(),
    notes: "ok",
  },
} as const;

describe("provenance helpers", () => {
  it("allows listing when verified and evidence complete", () => {
    const parsed = validateProvenance(base);
    expect(canListAsset(parsed)).toBe(true);
    expect(requiresMoreEvidence(parsed).required).toBe(false);
    expect(getProvenanceBadgeState(parsed)).toBe("verified");
  });

  it("flags missing category-required evidence", () => {
    const parsed = validateProvenance({
      ...base,
      evidence: [{ kind: "source_file", hash: "c".repeat(64), label: "source" }],
      evidenceHashes: ["c".repeat(64)],
      verificationStatus: "PENDING_REVIEW",
      reviewerDecision: undefined,
    });

    const check = requiresMoreEvidence(parsed);
    expect(check.required).toBe(true);
    expect(check.missingKinds).toContain("wip_image");
    expect(getProvenanceBadgeState(parsed)).toBe("needs_evidence");
  });
});
