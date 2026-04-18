"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { isValidSolanaAddress } from "@/lib/solanaAddress";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { OffchainAuctionDetail } from "@/types/offchainAuction";

type BidFormProps = {
  auction: OffchainAuctionDetail;
};

export default function BidForm({ auction }: BidFormProps) {
  const activeAccount = useActiveAccount();
  const [amount, setAmount] = useState(
    String(
      Math.max(
        auction.startPriceSol,
        (auction.highestBidSol ?? auction.startPriceSol) + auction.minIncrementSol,
      ).toFixed(2),
    ),
  );
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const minimumBid = useMemo(
    () => Math.max(auction.startPriceSol, (auction.highestBidSol ?? auction.startPriceSol) + auction.minIncrementSol),
    [auction.highestBidSol, auction.minIncrementSol, auction.startPriceSol],
  );

  useEffect(() => {
    if (activeAccount?.address && isValidSolanaAddress(activeAccount.address)) {
      setWalletAddress(activeAccount.address);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      const savedWallet =
        typeof data.user?.user_metadata?.wallet_address === "string"
          ? data.user.user_metadata.wallet_address
          : "";
      setWalletAddress(savedWallet);
    });
  }, [activeAccount?.address]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const biddingWallet = walletAddress.trim();
      if (!biddingWallet) {
        throw new Error("Enter the Solana wallet address that should be attached to this bid.");
      }

      if (!isValidSolanaAddress(biddingWallet)) {
        throw new Error("Enter a valid Solana wallet address.");
      }

      const amountLamports = Math.round(Number(amount) * 1_000_000_000);
      if (!Number.isFinite(amountLamports) || amountLamports <= 0) {
        throw new Error("Enter a valid bid amount.");
      }

      const response = await fetch(`/api/auctions/${auction.id}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bidderWallet: biddingWallet,
          amountLamports,
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
          Solana wallet address
        </label>
        <input
          id="bid-wallet"
          type="text"
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
          className="field-input"
          placeholder="Enter the Solana address to record for this bid"
        />
        <p className="mt-2 text-xs text-white/45">
          {activeAccount?.address && !isValidSolanaAddress(activeAccount.address)
            ? "Your connected thirdweb wallet is an EVM address, so it will not be used for Solana bidding."
            : "This Solana wallet will be written into the off-chain bid record."}
        </p>
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
