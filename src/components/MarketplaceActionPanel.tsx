"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useSendAndConfirmTransaction, ConnectButton } from "thirdweb/react";
import { bidInAuction, buyFromListing, buyoutAuction } from "thirdweb/extensions/marketplace";
import { getThirdwebClient } from "@/lib/thirdweb";
import { getMarketplaceChain, getMarketplaceContract } from "@/lib/thirdweb-config";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";

type MarketplaceActionPanelProps = {
  listingId: string;
  type: "auction" | "direct";
  minimumBidEth: number | null;
  buyoutPriceEth: number | null;
};

export default function MarketplaceActionPanel({
  listingId,
  type,
  minimumBidEth,
  buyoutPriceEth,
}: MarketplaceActionPanelProps) {
  const router = useRouter();
  const activeAccount = useActiveAccount();
  const sendTransaction = useSendAndConfirmTransaction();
  const [bidAmount, setBidAmount] = useState(
    minimumBidEth ? minimumBidEth.toFixed(4).replace(/0+$/, "").replace(/\.$/, "") : "0.01",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"bid" | "buyout" | "buy" | null>(null);

  const numericId = useMemo(() => {
    const parts = listingId.split("-", 2);
    return parts[1] ? BigInt(parts[1]) : 0n;
  }, [listingId]);

  async function handleBid() {
    setMessage(null);
    setPendingAction("bid");

    try {
      const transaction = bidInAuction({
        contract: getMarketplaceContract(),
        auctionId: numericId,
        bidAmount,
      });

      await sendTransaction.mutateAsync(transaction);
      setMessage("Bid confirmed onchain. Refreshing the listing state...");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to place bid.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBuyoutAuction() {
    setMessage(null);
    setPendingAction("buyout");

    try {
      const transaction = buyoutAuction({
        contract: getMarketplaceContract(),
        auctionId: numericId,
      });

      await sendTransaction.mutateAsync(transaction);
      setMessage("Auction buyout confirmed onchain. Refreshing...");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to buy out this auction.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleBuyListing() {
    if (!activeAccount?.address) {
      setMessage("Connect your wallet before buying.");
      return;
    }

    setMessage(null);
    setPendingAction("buy");

    try {
      const transaction = buyFromListing({
        contract: getMarketplaceContract(),
        listingId: numericId,
        quantity: 1n,
        recipient: activeAccount.address as `0x${string}`,
      });

      await sendTransaction.mutateAsync(transaction);
      setMessage("Purchase confirmed onchain. Refreshing...");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to buy this listing.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">
          {type === "auction" ? "Place bid" : "Buy listing"}
        </p>
        <p className="text-sm text-white/65">
          Transactions are submitted on {getMarketplaceChain().name}.
        </p>
      </div>

      <ConnectButton
        client={getThirdwebClient()}
        wallets={getThirdwebWalletOptions()}
        chain={getMarketplaceChain()}
        connectButton={{
          label: activeAccount ? "Wallet connected" : "Connect Base wallet",
          className: "!w-full !rounded-full !bg-white !text-black !px-5 !py-3 !font-semibold",
        }}
      />

      {type === "auction" ? (
        <>
          <div>
            <label htmlFor="bid-amount" className="field-label">
              Bid amount (ETH)
            </label>
            <input
              id="bid-amount"
              type="number"
              min={minimumBidEth ?? undefined}
              step="0.0001"
              value={bidAmount}
              onChange={(event) => setBidAmount(event.target.value)}
              className="field-input"
            />
          </div>

          <button
            type="button"
            onClick={handleBid}
            disabled={pendingAction !== null}
            className="button-primary w-full disabled:cursor-wait disabled:opacity-60"
          >
            {pendingAction === "bid" ? "Submitting bid..." : "Place onchain bid"}
          </button>

          {buyoutPriceEth ? (
            <button
              type="button"
              onClick={handleBuyoutAuction}
              disabled={pendingAction !== null}
              className="button-secondary w-full disabled:cursor-wait disabled:opacity-60"
            >
              {pendingAction === "buyout" ? "Buying out..." : `Buy out for ${buyoutPriceEth.toFixed(4)} ETH`}
            </button>
          ) : null}
        </>
      ) : (
        <button
          type="button"
          onClick={handleBuyListing}
          disabled={pendingAction !== null}
          className="button-primary w-full disabled:cursor-wait disabled:opacity-60"
        >
          {pendingAction === "buy" ? "Purchasing..." : `Buy now for ${buyoutPriceEth?.toFixed(4) ?? "--"} ETH`}
        </button>
      )}

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : null}
    </div>
  );
}
