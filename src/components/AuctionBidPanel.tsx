"use client";

import { useMemo, useState } from "react";
import type { AuctionLotRecord } from "@/lib/site-data";

type AuctionBidPanelProps = {
  saleId: string;
  lot: AuctionLotRecord;
};

const LAMPORTS_PER_SOL = 1_000_000_000;

function solToLamports(sol: number) {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export default function AuctionBidPanel({ saleId, lot }: AuctionBidPanelProps) {
  const [bidSol, setBidSol] = useState(lot.minimumNextBidSol);
  const [bidderWallet, setBidderWallet] = useState("BidderWallet111111111111111111111111111111");
  const [email, setEmail] = useState("collector@example.com");
  const [displayName, setDisplayName] = useState("Preview Collector");
  const [responseText, setResponseText] = useState("No bid prepared yet.");
  const [pending, setPending] = useState(false);

  const buyerPremiumSol = useMemo(() => Number(((bidSol * lot.buyerPremiumBps) / 10_000).toFixed(3)), [bidSol, lot.buyerPremiumBps]);
  const totalSol = useMemo(() => Number((bidSol + buyerPremiumSol).toFixed(3)), [bidSol, buyerPremiumSol]);

  async function prepareBid() {
    setPending(true);
    try {
      const result = await fetch("/api/auction/bid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          saleId,
          lotId: lot.id,
          bidderWallet,
          bidLamports: solToLamports(bidSol),
          buyerPremiumBps: lot.buyerPremiumBps,
          idempotencyKey: `bid-${lot.id}-${Date.now()}`,
          collector: {
            wallet: bidderWallet,
            email,
            displayName,
            collectorProfile: "Registered from the lot bidding panel.",
          },
        }),
      });

      setResponseText(await result.text());
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-[1.8rem] border border-[#d4af37]/20 bg-[#15120d]/80 p-6 shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Register To Bid</p>
          <h2 className="mt-2 text-3xl text-white">Timed auction lot {lot.lotNumber}</h2>
        </div>
        <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/12 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#f7d774]">
          {lot.status}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Current bid</p>
          <p className="mt-2 text-xl font-semibold text-white">{lot.currentBidSol || "No bids"}{lot.currentBidSol ? " SOL" : ""}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Estimate</p>
          <p className="mt-2 text-xl font-semibold text-white">{lot.estimateLowSol}-{lot.estimateHighSol} SOL</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/45">Reserve</p>
          <p className="mt-2 text-xl font-semibold text-white">{lot.reserveSol} SOL</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="bidder-wallet" className="field-label">Bidder Wallet</label>
          <input
            id="bidder-wallet"
            className="field-input"
            value={bidderWallet}
            onChange={(event) => setBidderWallet(event.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <label htmlFor="collector-email" className="field-label">Collector Email</label>
          <input
            id="collector-email"
            className="field-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="display-name" className="field-label">Display Name</label>
          <input
            id="display-name"
            className="field-input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="bid-amount" className="field-label">Bid Amount (SOL)</label>
          <input
            id="bid-amount"
            className="field-input"
            min={lot.minimumNextBidSol}
            step="0.1"
            type="number"
            value={bidSol}
            onChange={(event) => setBidSol(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-white/55">Bid</span>
          <span className="font-semibold text-white">{bidSol} SOL</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4 text-sm">
          <span className="text-white/55">Buyer premium ({lot.buyerPremiumBps / 100}%)</span>
          <span className="font-semibold text-white">{buyerPremiumSol} SOL</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-sm">
          <span className="text-white">Total before network fees</span>
          <span className="font-semibold text-[#f7d774]">{totalSol} SOL</span>
        </div>
      </div>

      <button type="button" onClick={prepareBid} disabled={pending} className="button-primary mt-5 w-full">
        {pending ? "Preparing Bid..." : "Prepare Solana Bid"}
      </button>

      <pre className="mt-5 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-white/62">
        {responseText}
      </pre>
    </article>
  );
}
