"use client";

import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Consign a lot",
    description:
      "Artists submit portfolio context, artwork details, reserve expectations, and human-authorship evidence for a high-touch review.",
    bullets: ["Portfolio context", "No-AI policy check", "Evidence packet assembly"],
  },
  {
    number: "02",
    title: "Curate the sale",
    description:
      "The curatorial desk approves human-made lots, writes catalog context, sets estimates, and schedules works into named timed auctions.",
    bullets: ["Curatorial approval", "Catalog essay", "Estimate and reserve"],
  },
  {
    number: "03",
    title: "Register, bid, settle",
    description:
      "Collectors register before bidding, inspect total cost, sign through their wallet, and rely on Solana as settlement truth.",
    bullets: ["Collector registration", "Buyer premium disclosure", "Post-sale support"],
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="section-shell">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="section-heading">
            <p className="eyebrow">How auctions work</p>
            <h2 className="text-3xl text-white text-balance sm:text-5xl">A working path from consignment to collector ownership.</h2>
            <p className="section-kicker">
              The flow below mirrors the premium auction-house model: curate fewer human-made lots, disclose more context, support artists with reserves, and keep bidding wallet-safe.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/submit" className="button-primary">
              Request Consignment
            </Link>
            <Link href="/#featured" className="button-secondary">
              Explore Auction Lots
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
