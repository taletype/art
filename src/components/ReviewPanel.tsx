"use client";

import { useState } from "react";
import type { Provenance, VerificationStatus } from "../types/provenance";

interface ReviewPanelProps {
  provenance: Provenance;
  onUpdate: (provenance: Provenance) => void;
  reviewerWallet: string;
  enabled: boolean;
}

const statusButtons: { label: string; status: VerificationStatus; tone: string }[] = [
  {
    label: "Mark pending",
    status: "PENDING_REVIEW",
    tone: "border-white/12 bg-white/5 text-white/80 hover:bg-white/10",
  },
  {
    label: "Verify human",
    status: "VERIFIED_HUMAN",
    tone: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15",
  },
  {
    label: "Reject",
    status: "REJECTED",
    tone: "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15",
  },
];

export function ReviewPanel({ provenance, onUpdate, reviewerWallet, enabled }: ReviewPanelProps) {
  const [notes, setNotes] = useState("");

  function updateStatus(status: VerificationStatus) {
    if (!enabled) {
      return;
    }

    const now = new Date().toISOString();

    onUpdate({
      ...provenance,
      verificationStatus: status,
      rejectionReason: status === "REJECTED" ? notes || "Reviewer rejected evidence" : undefined,
      reviewerDecision:
        status === "VERIFIED_HUMAN"
          ? {
              reviewerWallet,
              decidedAt: now,
              notes: notes || "Evidence packet verified by mock review flow.",
            }
          : undefined,
    });
  }

  return (
    <section className="glass rounded-[1.8rem] border border-white/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Review panel</p>
          <h3 className="mt-2 text-2xl text-white">Mock reviewer controls</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${
            enabled
              ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
              : "border-white/10 bg-white/5 text-white/45"
          }`}
        >
          {enabled ? "Review enabled" : "Read only"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-white/62">
        Reviewer wallet: <span className="break-all text-white/82">{reviewerWallet}</span>
      </p>
      <p className="mt-2 text-sm leading-7 text-white/55">
        Current status: <span className="text-white/82">{provenance.verificationStatus.replace(/_/g, " ")}</span>
      </p>

      <div className="mt-5">
        <label htmlFor="reviewer-notes" className="field-label">Reviewer Notes</label>
        <textarea
          id="reviewer-notes"
          name="reviewerNotes"
          className="field-textarea min-h-[120px]"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Document why the packet is ready, still pending, or rejected…"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {statusButtons.map((item) => (
          <button
            key={item.status}
            type="button"
            onClick={() => updateStatus(item.status)}
            disabled={!enabled}
            className={`inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${item.tone}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs leading-6 text-white/40">
        {enabled
          ? "These controls simulate reviewer decisions so the UI can be tested end to end before the real moderation flow is wired."
          : "Set NEXT_PUBLIC_ENABLE_MOCK_REVIEW=true to enable the mock moderation controls."}
      </p>
    </section>
  );
}
