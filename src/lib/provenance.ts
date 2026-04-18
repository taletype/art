import type { EvidenceKind, EvidenceItem, Provenance, VerificationStatus } from "../types/provenance";

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

  return {
    category: (input.category as string) || "visual",
    medium: (input.medium as string) || "digital painting",
    evidence,
    evidenceHashes,
    verificationStatus: (input.verificationStatus as VerificationStatus) || "PENDING_REVIEW",
    attestation: {
      signerWallet: (input.attestation?.signerWallet as string) || "",
      signedAt: (input.attestation?.signedAt as string) || new Date().toISOString(),
    },
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
