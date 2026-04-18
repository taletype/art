"use client";

import { FormEvent, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AuctionDetail } from "@/types/auction-v1";

type BidFormProps = {
  auction: AuctionDetail;
};

export default function BidForm({ auction }: BidFormProps) {
  const [amount, setAmount] = useState(
    String(
      Math.max(auction.startPrice, (auction.highestBid ?? auction.startPrice) + auction.minIncrement).toFixed(2),
    ),
  );
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const minimumBid = useMemo(
    () => Math.max(auction.startPrice, (auction.highestBid ?? auction.startPrice) + auction.minIncrement),
    [auction.highestBid, auction.minIncrement, auction.startPrice],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Log in before placing a bid.");
      }

      const response = await fetch(`/api/auctions/${auction.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount,
          walletAddress: walletAddress || undefined,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to place bid.");
      }

      setMessage("Bid accepted. Refreshing the page for the updated ladder.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place bid.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Place bid</p>
        <p className="text-sm text-white/65">Minimum next bid: {minimumBid.toFixed(2)} SOL</p>
      </div>

      <div>
        <label htmlFor="bid-amount" className="field-label">
          Bid amount (SOL)
        </label>
        <input
          id="bid-amount"
          type="number"
          min={minimumBid}
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="field-input"
          required
        />
      </div>

      <div>
        <label htmlFor="bid-wallet" className="field-label">
          Solana wallet
        </label>
        <input
          id="bid-wallet"
          type="text"
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
          className="field-input"
          placeholder="Optional if already saved on your account"
        />
      </div>

      <button type="submit" disabled={pending} className="button-primary w-full disabled:cursor-wait disabled:opacity-70">
        {pending ? "Submitting bid..." : "Submit bid"}
      </button>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : null}
    </form>
  );
}
