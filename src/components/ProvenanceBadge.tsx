import { getProvenanceBadgeState } from "../lib/provenance";
import type { Provenance } from "../types/provenance";

interface ProvenanceBadgeProps {
  provenance: Provenance;
}

const stateStyles = {
  verified: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  pending: "border-amber-300/25 bg-amber-200/10 text-amber-100",
  rejected: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  needs_evidence: "border-sky-300/25 bg-sky-300/10 text-sky-100",
} as const;

const stateLabel = {
  verified: "Verified human",
  pending: "Under review",
  rejected: "Rejected",
  needs_evidence: "Needs evidence",
} as const;

export function ProvenanceBadge({ provenance }: ProvenanceBadgeProps) {
  const state = getProvenanceBadgeState(provenance);

  return (
    <span
      data-state={state}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${stateStyles[state]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {stateLabel[state]}
      <span className="hidden text-current/70 sm:inline">• {provenance.category} / {provenance.medium}</span>
    </span>
  );
}
