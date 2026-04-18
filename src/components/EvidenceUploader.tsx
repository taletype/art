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
    <section className="glass rounded-[1.75rem] border border-white/10 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Evidence packet</p>
          <h3 className="mt-2 text-2xl text-white">Attach the proof collectors and reviewers need.</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/55">
          {value.length} item{value.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
        <div>
          <label className="field-label">Evidence type</label>
          <select
            className="field-select"
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

        <div>
          <label className="field-label">Label</label>
          <input
            className="field-input"
            placeholder="WIP screenshot, source file, signed doc..."
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <div>
          <label className="field-label">SHA-256 hash</label>
          <input
            className="field-input"
            placeholder="Paste a 64-character hash"
            value={hash}
            onChange={(event) => setHash(event.target.value)}
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={addEvidence}
            disabled={!canAdd}
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#f3ead8] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Add evidence
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {value.map((item, index) => (
          <div
            key={`${item.hash}-${index}`}
            className="flex flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold capitalize text-white">{formatKind(item.kind)}</p>
              <p className="mt-1 text-sm text-white/65">{item.label}</p>
              <p className="mt-2 break-all text-xs uppercase tracking-[0.14em] text-white/38">
                {shortenHash(item.hash)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeEvidence(index)}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-black/35 hover:text-white"
            >
              Remove
            </button>
          </div>
        ))}

        {value.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm leading-7 text-white/50">
            No evidence attached yet. Add at least one strong source artifact or process capture before preparing the packet.
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-6 text-white/40">
        Linked hashes: {evidenceHashes.length > 0 ? `${evidenceHashes.length} record(s) ready` : "none yet"}
      </p>
    </section>
  );
}
