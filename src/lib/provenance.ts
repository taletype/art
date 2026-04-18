import { z } from "zod";
import {
  type ArtCategory,
  type EvidenceKind,
  type Provenance,
  type ProvenanceBadgeState,
  provenanceSchema,
} from "../types/provenance";

const categoryEvidenceRequirements: Record<
  ArtCategory,
  { minItems: number; requiredKinds: EvidenceKind[] }
> = {
  visual: { minItems: 2, requiredKinds: ["source_file", "wip_image"] },
  audio: { minItems: 2, requiredKinds: ["session_file", "audio_stems"] },
  video: { minItems: 2, requiredKinds: ["project_file", "raw_capture"] },
  writing: { minItems: 2, requiredKinds: ["manuscript_draft", "supporting_doc"] },
  mixed_media: { minItems: 3, requiredKinds: ["project_file", "wip_image"] },
};

export const verifyProvenancePayloadSchema = z.object({
  provenance: provenanceSchema,
  forceStatus: z.enum(["PENDING_REVIEW", "VERIFIED_HUMAN", "REJECTED"]).optional(),
});

export function validateProvenance(input: unknown): Provenance {
  return provenanceSchema.parse(input);
}

export function requiresMoreEvidence(provenance: Provenance): {
  required: boolean;
  missingKinds: EvidenceKind[];
  minItemsRequired: number;
} {
  const rule = categoryEvidenceRequirements[provenance.category];
  const providedKinds = new Set(provenance.evidence.map((item) => item.kind));
  const missingKinds = rule.requiredKinds.filter((kind) => !providedKinds.has(kind));
  const insufficientItemCount = provenance.evidence.length < rule.minItems;

  return {
    required: insufficientItemCount || missingKinds.length > 0,
    missingKinds,
    minItemsRequired: rule.minItems,
  };
}

export function canListAsset(provenance: Provenance): boolean {
  const evidenceStatus = requiresMoreEvidence(provenance);
  return provenance.verificationStatus === "VERIFIED_HUMAN" && !evidenceStatus.required;
}

export function getProvenanceBadgeState(provenance: Provenance): ProvenanceBadgeState {
  if (provenance.verificationStatus === "REJECTED") {
    return "rejected";
  }

  if (requiresMoreEvidence(provenance).required) {
    return "needs_evidence";
  }

  if (provenance.verificationStatus === "VERIFIED_HUMAN") {
    return "verified";
  }

  return "pending";
}

export function getListingGateFailureReason(provenance: Provenance): string | null {
  if (provenance.verificationStatus !== "VERIFIED_HUMAN") {
    return "Only VERIFIED_HUMAN assets can be listed publicly.";
  }

  const evidenceState = requiresMoreEvidence(provenance);
  if (evidenceState.required) {
    const missingKinds = evidenceState.missingKinds.join(", ") || "additional evidence";
    return `More evidence is required before listing. Missing: ${missingKinds}.`;
  }

  return null;
}
