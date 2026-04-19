"use client";

import { useMemo, useState } from "react";
import type { EvidenceItem, EvidenceKind } from "../types/provenance";

const evidenceKindOptions: EvidenceKind[] = [
  "source_file",
  "timelapse",
  "wip_image",
  "raw_capture",
  "session_file",
  "audio_stems",
  "manuscript_draft",
  "project_file",
  "supporting_doc",
];

interface EvidenceUploaderProps {
  value: EvidenceItem[];
  onChange: (items: EvidenceItem[]) => void;
}

function formatKind(kind: EvidenceKind) {
  return kind.replace(/_/g, " ");
}

function shortenHash(hash: string) {
  return hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash;
}

export function EvidenceUploader({ value, onChange }: EvidenceUploaderProps) {
  const [kind, setKind] = useState<EvidenceKind>("source_file");
  const [label, setLabel] = useState("");
  const [hash, setHash] = useState("");

  const evidenceHashes = useMemo(() => value.map((item) => item.hash), [value]);
  const canAdd = label.trim().length > 0 && hash.trim().length >= 32;

  function addEvidence() {
    if (!canAdd) {
      return;
    }

    onChange([...value, { kind, label: label.trim(), hash: hash.trim() }]);
    setLabel("");
    setHash("");
  }

  function removeEvidence(index: number) {
    onChange(value.filter((_, idx) => idx !== index));
  }

  return (
    <section className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1 sm:space-y-2">
          <p className="eyebrow text-[10px] sm:text-xs">Evidence packet</p>
          <h3 className="text-xl sm:text-2xl lg:text-3xl text-white">Attach the proof collectors and reviewers need.</h3>
          <p className="text-xs sm:text-sm text-white/65">Add source files, WIP screenshots, or process captures to verify human authorship.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 sm:px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.16em] font-medium ${value.length > 0 ? "border-[#d4af37]/30 bg-[#d4af37]/12 text-[#f7d774]" : "border-white/10 bg-white/5 text-white/55"}`}>
            {value.length} item{value.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="evidence-kind" className="field-label">Evidence Type</label>
          <select
            id="evidence-kind"
            name="evidenceKind"
            className="field-select py-3"
            value={kind}
            onChange={(event) => setKind(event.target.value as EvidenceKind)}
          >
            {evidenceKindOptions.map((option) => (
              <option key={option} value={option}>
                {formatKind(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="evidence-label" className="field-label">Label</label>
          <input
            id="evidence-label"
            name="evidenceLabel"
            className="field-input py-3"
            placeholder="WIP screenshot, source file…"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="evidence-hash" className="field-label">SHA-256 hash</label>
          <input
            id="evidence-hash"
            name="evidenceHash"
            className="field-input py-3"
            spellCheck={false}
            autoComplete="off"
            placeholder="64-character hash"
            value={hash}
            onChange={(event) => setHash(event.target.value)}
          />
          {hash.length > 0 && hash.length < 64 && (
            <p className="mt-2 text-[10px] sm:text-xs text-white/45">Hash must be 64 characters</p>
          )}
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={addEvidence}
            disabled={!canAdd}
            className="button-primary w-full text-xs sm:text-sm py-3 disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]"
          >
            Add Evidence
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 space-y-2 sm:space-y-3">
        {value.map((item, index) => (
          <div
            key={`${item.hash}-${index}`}
            className="group flex flex-col gap-3 sm:gap-4 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5 transition hover:border-white/20 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="rounded-full border border-white/10 bg-[#d4af37]/12 px-2 sm:px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.14em] text-[#f7d774]">
                  {formatKind(item.kind)}
                </span>
                <p className="text-xs sm:text-sm font-semibold text-white">{item.label}</p>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center gap-3 sm:gap-4">
                <code className="text-[10px] sm:text-xs font-mono text-white/45">{shortenHash(item.hash)}</code>
                <span className="text-[10px] sm:text-xs text-white/35">SHA-256</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeEvidence(index)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium text-white/70 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98]"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Remove
            </button>
          </div>
        ))}

        {value.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.02] p-6 sm:p-8 text-center">
            <div className="mx-auto mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white/35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white/70">No evidence attached yet</p>
            <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-white/45">Add at least one source artifact or process capture before preparing the packet.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 sm:mt-6 flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-black/30 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${evidenceHashes.length > 0 ? "bg-green-500" : "bg-white/30"}`} />
          <span className="text-[10px] sm:text-xs text-white/55">
            {evidenceHashes.length > 0 ? `${evidenceHashes.length} record(s) ready` : "No hashes linked yet"}
          </span>
        </div>
        <span className="text-[10px] sm:text-xs text-white/35">SHA-256 verification</span>
      </div>
    </section>
  );
}
