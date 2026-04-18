import { z } from "zod";
import type { ArtCategory, EvidenceItem, Provenance, VerificationStatus } from "../types/provenance";

export function getHumanMadePolicyFailureReason(provenance: Provenance): string | null {
  if (provenance.verificationStatus === "VERIFIED_HUMAN") {
    return null;
  }

  if (provenance.evidenceHashes.length === 0) {
    return "No evidence hashes provided. Add at least one source artifact or process capture.";
  }

  if (provenance.category === "writing" && !provenance.evidenceHashes.some((hash) => hash.length >= 32)) {
    return "Writing category requires manuscript drafts or supporting documents with valid hashes.";
  }

  return null;
}

export function getProvenanceBadgeState(provenance: Provenance): "verified" | "pending" | "rejected" | "needs_evidence" {
  if (provenance.verificationStatus === "VERIFIED_HUMAN") {
    return "verified";
  }

  if (provenance.verificationStatus === "REJECTED") {
    return "rejected";
  }

  if (provenance.verificationStatus === "PENDING_REVIEW") {
    return "pending";
  }

  if (provenance.evidenceHashes.length === 0) {
    return "needs_evidence";
  }

  return "pending";
}

export function validateProvenance(input: Record<string, unknown>): Provenance {
  const evidence = (input.evidence || []) as EvidenceItem[];
  const evidenceHashes = evidence.map((item) => item.hash);
  const category = (input.category as ArtCategory) || "visual";
  const attestation = input.attestation as Record<string, unknown> | undefined;

  return {
    category,
    medium: (input.medium as string) || "digital painting",
    creationMethod: (input.creationMethod as "HUMAN_ORIGINAL" | "HUMAN_TOOL_ASSISTED" | "COLLABORATIVE_HUMAN") || "HUMAN_ORIGINAL",
    attestation: {
      text: (attestation?.text as string) || "I attest that this work is human-made.",
      signerWallet: (attestation?.signerWallet as string) || "",
      timestamp: (attestation?.timestamp as string) || new Date().toISOString(),
      signatureRef: (attestation?.signatureRef as string) || "",
    },
    evidence,
    evidenceHashes,
    verificationStatus: (input.verificationStatus as VerificationStatus) || "PENDING_REVIEW",
  };
}

export function canListAsset(provenance: Provenance): boolean {
  return provenance.verificationStatus === "VERIFIED_HUMAN";
}

export function getListingGateFailureReason(provenance: Provenance): string | null {
  if (!canListAsset(provenance)) {
    return "Asset must be verified as human-made before listing.";
  }
  return null;
}

export function requiresMoreEvidence(provenance: Provenance): string[] {
  const missing: string[] = [];

  if (provenance.evidenceHashes.length === 0) {
    missing.push("At least one evidence hash is required");
  }

  if (!provenance.category) {
    missing.push("Category is required");
  }

  if (!provenance.medium) {
    missing.push("Medium is required");
  }

  return missing;
}

export const verifyProvenancePayloadSchema = z.object({
  provenance: z.object({
    category: z.enum(["visual", "audio", "video", "writing", "mixed_media"]),
    medium: z.string(),
    evidence: z.array(z.object({
      kind: z.string(),
      label: z.string(),
      hash: z.string(),
    })),
    verificationStatus: z.enum(["PENDING_REVIEW", "VERIFIED_HUMAN", "REJECTED"]).optional(),
  }),
  forceStatus: z.enum(["PENDING_REVIEW", "VERIFIED_HUMAN", "REJECTED"]).optional(),
});
