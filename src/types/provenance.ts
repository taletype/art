import { z } from "zod";

export const artCategorySchema = z.enum([
  "visual",
  "audio",
  "video",
  "writing",
  "mixed_media",
]);

export const creationMethodSchema = z.enum([
  "HUMAN_ORIGINAL",
  "HUMAN_TOOL_ASSISTED",
  "COLLABORATIVE_HUMAN",
]);

export const verificationStatusSchema = z.enum([
  "PENDING_REVIEW",
  "VERIFIED_HUMAN",
  "REJECTED",
]);

export const evidenceKindSchema = z.enum([
  "source_file",
  "timelapse",
  "wip_image",
  "raw_capture",
  "session_file",
  "audio_stems",
  "manuscript_draft",
  "project_file",
  "supporting_doc",
]);

export const evidenceItemSchema = z.object({
  kind: evidenceKindSchema,
  hash: z.string().min(32),
  label: z.string().min(2).max(120),
});

export const privateEvidenceRefSchema = z.object({
  objectKey: z.string().min(3),
  provider: z.enum(["s3", "r2", "gcs", "other"]),
  encrypted: z.boolean().default(true),
});

export const reviewerDecisionSchema = z.object({
  reviewerWallet: z.string().min(32),
  decidedAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const humanAttestationSchema = z.object({
  text: z.string().min(20),
  signerWallet: z.string().min(32),
  timestamp: z.string().datetime(),
  signatureRef: z.string().min(8),
});

export const provenanceSchema = z
  .object({
    category: artCategorySchema,
    medium: z.string().min(2).max(100),
    creationMethod: creationMethodSchema,
    attestation: humanAttestationSchema,
    evidence: z.array(evidenceItemSchema).min(1),
    evidenceHashes: z.array(z.string().min(32)).min(1),
    privateEvidenceRefs: z.array(privateEvidenceRefSchema).optional(),
    verificationStatus: verificationStatusSchema,
    reviewerDecision: reviewerDecisionSchema.optional(),
    rejectionReason: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.verificationStatus === "REJECTED" && !value.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason is required when status is REJECTED",
        path: ["rejectionReason"],
      });
    }

    if (value.verificationStatus === "VERIFIED_HUMAN" && !value.reviewerDecision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reviewerDecision is required when status is VERIFIED_HUMAN",
        path: ["reviewerDecision"],
      });
    }
  });

export type ArtCategory = z.infer<typeof artCategorySchema>;
export type CreationMethod = z.infer<typeof creationMethodSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type PrivateEvidenceRef = z.infer<typeof privateEvidenceRefSchema>;
export type ReviewerDecision = z.infer<typeof reviewerDecisionSchema>;
export type HumanAttestation = z.infer<typeof humanAttestationSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;

export type ProvenanceBadgeState = "verified" | "pending" | "rejected" | "needs_evidence";
