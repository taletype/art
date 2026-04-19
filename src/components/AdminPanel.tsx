"use client";

import Link from "next/link";
import { useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { getThirdwebClient } from "@/lib/thirdweb";
import { getMarketplaceChain } from "@/lib/thirdweb-config";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";
import { ReviewPanel } from "@/components/ReviewPanel";
import type { Provenance } from "@/types/provenance";

type AdminPanelProps = {
  adminWallet: string | null;
  marketplaceDeployUrl: string;
  collectionDeployUrl: string;
  envStatus: Array<{
    label: string;
    configured: boolean;
    value: string;
  }>;
};

function shortWallet(value: string | null) {
  if (!value) {
    return "Not connected";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function AdminPanel({
  adminWallet,
  marketplaceDeployUrl,
  collectionDeployUrl,
  envStatus,
}: AdminPanelProps) {
  const activeAccount = useActiveAccount();
  const connectedWallet = activeAccount?.address ?? null;
  const isAdmin =
    Boolean(adminWallet && connectedWallet) &&
    connectedWallet?.toLowerCase() === adminWallet?.toLowerCase();
  const readyCount = envStatus.filter((item) => item.configured).length;
  const missingCount = envStatus.length - readyCount;
  const [provenance, setProvenance] = useState<Provenance>({
    category: "visual",
    medium: "digital painting",
    creationMethod: "HUMAN_ORIGINAL",
    attestation: {
      text: "I certify this artwork is human-created, not AI-generated or AI-assisted.",
      signerWallet: connectedWallet || "0x0000000000000000000000000000000000000000",
      timestamp: new Date().toISOString(),
      signatureRef: "sig-ref-base",
    },
    evidence: [
      { kind: "source_file", hash: "a".repeat(64), label: "Source file" },
      { kind: "wip_image", hash: "b".repeat(64), label: "WIP screenshot" },
    ],
    evidenceHashes: ["a".repeat(64), "b".repeat(64)],
    verificationStatus: "PENDING_REVIEW",
  });

  return (
    <main className="section-shell pb-24 pt-28">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="eyebrow">Admin</p>
            <h1 className="max-w-4xl text-5xl leading-tight sm:text-6xl">Contract control panel</h1>
            <p className="max-w-2xl text-lg leading-8 text-white/68">
              Connect the admin wallet, deploy the default thirdweb contracts, then paste the deployed addresses into the app env.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Access</p>
              <p className="mt-2 text-2xl font-semibold text-white">{isAdmin ? "Admin" : "Locked"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Configured env</p>
              <p className="mt-2 text-2xl font-semibold text-white">{readyCount}/{envStatus.length}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-white/45">Missing</p>
              <p className="mt-2 text-2xl font-semibold text-white">{missingCount}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-5 rounded-[1.8rem] border border-[#d4af37]/20 bg-white/[0.03] p-6">
          <div className="space-y-2">
            <p className="eyebrow">Wallet gate</p>
            <h2 className="text-3xl">Admin wallet</h2>
            <p className="break-all text-sm leading-7 text-white/62">
              {adminWallet ?? "Set NEXT_PUBLIC_ADMIN_WALLET in .env.local"}
            </p>
          </div>

          <ConnectButton
            client={getThirdwebClient()}
            wallets={getThirdwebWalletOptions()}
            chain={getMarketplaceChain()}
            connectButton={{
              label: connectedWallet ? "Wallet connected" : "Connect admin wallet",
              className: "!w-full !rounded-full !bg-white !text-black !px-5 !py-3 !font-semibold",
            }}
          />

          <div className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-white/45">Connected</p>
            <p className="mt-2 text-lg font-semibold text-white">{shortWallet(connectedWallet)}</p>
          </div>

          {!isAdmin ? (
            <p className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
              Connect the configured admin wallet to unlock deployment actions.
            </p>
          ) : null}
        </aside>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
          <div className="space-y-2">
            <p className="eyebrow">One-click setup</p>
            <h2 className="text-3xl">Default thirdweb contracts</h2>
            <p className="text-sm leading-7 text-white/62">
              Deploy a Marketplace contract and an NFT Collection on Base Sepolia using thirdweb&apos;s dashboard. The connected admin wallet should deploy and own both contracts.
            </p>
          </div>

          <a
            href={marketplaceDeployUrl}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!isAdmin}
            className={`button-primary w-full ${isAdmin ? "" : "pointer-events-none opacity-50"}`}
          >
            Deploy Marketplace
          </a>

          <a
            href={collectionDeployUrl}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!isAdmin}
            className={`button-secondary w-full ${isAdmin ? "" : "pointer-events-none opacity-50"}`}
          >
            Deploy NFT Collection
          </a>

          <div className="flex flex-wrap gap-3">
            <Link href="/seller" className="button-secondary">
              Seller Hub
            </Link>
            <Link href="/auctions" className="button-secondary">
              Auctions
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="eyebrow">Environment</p>
              <h2 className="text-3xl">Launch checklist</h2>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.4rem] border border-white/10">
            {envStatus.map((item) => (
              <div
                key={item.label}
                className="grid gap-3 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 sm:grid-cols-[0.9fr_1.3fr_auto]"
              >
                <p className="font-semibold text-white">{item.label}</p>
                <p className="break-all text-sm text-white/60">{item.value}</p>
                <span className={item.configured ? "status-pill border-emerald-300/25 bg-emerald-300/10 text-emerald-100" : "status-pill border-amber-300/25 bg-amber-300/10 text-amber-100"}>
                  {item.configured ? "Ready" : "Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <ReviewPanel
          provenance={provenance}
          onUpdate={setProvenance}
          reviewerWallet={adminWallet || "0x0000000000000000000000000000000000000000"}
          enabled={process.env.NEXT_PUBLIC_ENABLE_MOCK_REVIEW === "true"}
        />
      </section>
    </main>
  );
}
