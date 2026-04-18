"use client";

import { useEffect, useMemo, useState } from "react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { BuyFundingWidget } from "./BuyFundingWidget";
import type { PurchaseState } from "../types/art";

interface BuyNowButtonProps {
  buyerSolAddress: string;
  sellerWallet: string;
  listingId: string;
  assetId: string;
  treasuryMint: string;
  priceInSol: number;
  rpcUrl: string;
}

type PhantomLike = {
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};

declare global {
  interface Window {
    solana?: PhantomLike;
  }
}

const STORAGE_KEY = "human_arts_last_purchase_key";

function readableState(state: PurchaseState | null) {
  if (!state) return "Idle";
  return state.replaceAll("_", " ").toLowerCase();
}

export function BuyNowButton({
  buyerSolAddress,
  sellerWallet,
  listingId,
  assetId,
  treasuryMint,
  priceInSol,
  rpcUrl,
}: BuyNowButtonProps) {
  const [showFunding, setShowFunding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [purchaseState, setPurchaseState] = useState<PurchaseState | null>(null);
  const [statusMessage, setStatusMessage] = useState("idle");

  const requiredLamports = useMemo(
    () => Math.ceil(priceInSol * LAMPORTS_PER_SOL),
    [priceInSol],
  );

  async function buyerBalanceLamports() {
    const connection = new Connection(rpcUrl, "confirmed");
    return connection.getBalance(new PublicKey(buyerSolAddress));
  }

  async function pollExisting(idempotencyKey: string) {
    const statusRes = await fetch(`/api/purchase?idempotencyKey=${encodeURIComponent(idempotencyKey)}`);
    if (!statusRes.ok) {
      return;
    }
    const statusPayload = (await statusRes.json()) as {
      purchase?: { status?: PurchaseState; error?: string };
    };
    if (statusPayload.purchase?.status) {
      setPurchaseState(statusPayload.purchase.status);
      setStatusMessage(statusPayload.purchase.error ?? `Recovered state: ${statusPayload.purchase.status}`);
    }
  }

  useEffect(() => {
    const existingKey = localStorage.getItem(STORAGE_KEY);
    if (existingKey) {
      void pollExisting(existingKey);
    }
  }, []);

  async function confirmAndPoll(idempotencyKey: string, signature: string) {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await fetch("/api/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          payload: { idempotencyKey, txSignature: signature },
        }),
      });

      const statusRes = await fetch(`/api/purchase?idempotencyKey=${encodeURIComponent(idempotencyKey)}`);
      const statusPayload = (await statusRes.json()) as {
        purchase?: { status?: PurchaseState; error?: string };
      };

      const nextState = statusPayload.purchase?.status;
      if (nextState) {
        setPurchaseState(nextState);
        if (nextState === "TX_CONFIRMED") {
          setStatusMessage("Purchase confirmed on Solana RPC.");
          return;
        }

        if (nextState === "FAILED") {
          setStatusMessage(statusPayload.purchase?.error ?? "Purchase failed after submission.");
          return;
        }

        if (statusPayload.purchase?.error) {
          setStatusMessage(statusPayload.purchase.error);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, Math.min(3000, 1200 + attempt * 200)));
    }

    setStatusMessage("Confirmation is still pending on RPC. Refresh again shortly.");
  }

  async function buyNow() {
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      const balance = await buyerBalanceLamports();
      if (balance < requiredLamports + 20_000) {
        setPurchaseState("NEEDS_FUNDING");
        setShowFunding(true);
        setStatusMessage("Insufficient balance. Fund wallet to continue.");
        return;
      }

      const idempotencyKey = `${listingId}-${buyerSolAddress}-${Date.now()}`;
      localStorage.setItem(STORAGE_KEY, idempotencyKey);

      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          payload: {
            listingId,
            buyerWallet: buyerSolAddress,
            sellerWallet,
            assetId,
            treasuryMint,
            priceLamports: requiredLamports,
            buyerBalanceLamports: balance,
            idempotencyKey,
          },
        }),
      });

      const payload = (await response.json()) as {
        purchase?: {
          status: PurchaseState;
          unsignedTxBase64?: string;
          reason?: string;
          blockingErrors?: string[];
        };
      };

      const nextState = payload.purchase?.status ?? "FAILED";
      setPurchaseState(nextState);

      if (payload.purchase?.blockingErrors?.length) {
        setStatusMessage(payload.purchase.blockingErrors.join(" | "));
        return;
      }

      if (nextState !== "TX_PREPARED") {
        setStatusMessage(payload.purchase?.reason ?? "Unable to prepare transaction.");
        return;
      }

      const encoded = payload.purchase?.unsignedTxBase64;
      if (!encoded) {
        setPurchaseState("FAILED");
        setStatusMessage("Missing unsigned transaction payload.");
        return;
      }

      if (!window.solana?.signAndSendTransaction) {
        setStatusMessage("No Solana wallet found for signing. Install Phantom-compatible wallet.");
        return;
      }

      const tx = Transaction.from(Buffer.from(encoded, "base64"));
      const signed = await window.solana.signAndSendTransaction(tx);
      setStatusMessage(`Transaction submitted: ${signed.signature}`);

      await confirmAndPoll(idempotencyKey, signed.signature);
    } catch (error) {
      console.error(error);
      setPurchaseState("FAILED");
      setStatusMessage("Purchase failed during prepare/sign/send/confirm.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={buyNow}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#f3ead8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Processing purchase..." : `Buy now • ${priceInSol} SOL`}
      </button>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <p className="text-white/60">
          State: <span className="font-medium capitalize text-white">{readableState(purchaseState)}</span>
        </p>
        <p className="mt-2 text-white/70">{statusMessage}</p>
      </div>

      {showFunding ? (
        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">Funding required</p>
          <BuyFundingWidget
            amount={priceInSol.toString()}
            onSuccess={() => {
              setShowFunding(false);
              setPurchaseState("READY_TO_PURCHASE");
              setStatusMessage("Funding complete. Retry purchase.");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
