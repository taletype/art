"use client";

import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Submit evidence",
    description:
      "Creators upload source files, process captures, and signed attestations so every listing starts with a transparent proof packet.",
    bullets: ["Evidence packet assembly", "Creator attestation", "Category-specific requirements"],
  },
  {
    number: "02",
    title: "Review + verification",
    description:
      "HUMAN_ reviewers evaluate the packet for human authorship consistency and either approve, request more evidence, or reject.",
    bullets: ["Reviewer decision trail", "Clear status updates", "Collector-facing trust metadata"],
  },
  {
    number: "03",
    title: "Mint, list, collect",
    description:
      "Verified works are prepared for minting and listing, then collected through a Solana-native flow with durable purchase state.",
    bullets: ["On-chain listing prep", "Fast Solana checkout", "Creator-first settlement"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="section-heading">
            <p className="eyebrow">How HUMAN_ works</p>
            <h2 className="text-3xl text-white text-balance sm:text-5xl">A working path from creator evidence to collector ownership.</h2>
            <p className="section-kicker">
              The flow below mirrors the actual product sequence: submit, review, prepare, list, and collect.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/submit" className="button-primary">
              Start Submission
            </Link>
            <Link href="/#featured" className="button-secondary">
              Explore Verified Works
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-7"
            >
              <div className="absolute right-5 top-4 text-6xl font-semibold text-white/10">{step.number}</div>
              <p className="eyebrow">Step {index + 1}</p>
              <h3 className="mt-2 text-2xl text-white">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/60">{step.description}</p>
              <ul className="mt-6 space-y-2">
                {step.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm text-white/72">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f3d27a]" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
