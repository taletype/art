"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { isValidEvmAddress } from "@/lib/evmAddress";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getThirdwebClient } from "@/lib/thirdweb";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";
import { getMarketplaceChain } from "@/lib/thirdweb-config";

type SessionState = {
  email: string | null;
  walletAddress: string | null;
} | null;

export default function WalletConnect() {
  const activeAccount = useActiveAccount();
  const [session, setSession] = useState<SessionState>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const connectedWallet =
    activeAccount?.address && isValidEvmAddress(activeAccount.address) ? activeAccount.address : null;
  const canSaveToProfile = sessionLoaded && Boolean(session);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setSession(null);
        setSessionLoaded(true);
        return;
      }

      const savedWallet = typeof user.user_metadata?.wallet_address === "string"
        ? user.user_metadata.wallet_address
        : null;

      setSession({
        email: user.email ?? null,
        walletAddress: savedWallet,
      });
      setWalletAddress(savedWallet ?? "");
      setSessionLoaded(true);
    }

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void hydrate();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (connectedWallet) {
      setWalletAddress(connectedWallet);
    }
  }, [connectedWallet]);

  async function saveWalletAddress() {
    setMessage(null);
    try {
      const nextWallet = connectedWallet ?? walletAddress.trim();
      if (!session) {
        throw new Error("Log in or create an app profile before saving this wallet to your profile.");
      }

      if (!nextWallet) {
        throw new Error("Enter a Base Sepolia wallet address before saving.");
      }

      if (!isValidEvmAddress(nextWallet)) {
        throw new Error("Enter a valid EVM wallet address.");
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.updateUser({
        data: {
          wallet_address: nextWallet,
        },
      });

      if (error) {
        throw error;
      }

      setSession((current) =>
        current
          ? {
              ...current,
              walletAddress:
                typeof data.user.user_metadata?.wallet_address === "string"
                  ? data.user.user_metadata.wallet_address
                  : null,
            }
          : current,
      );
      setWalletAddress(nextWallet);
      setMessage("Saved Base Sepolia wallet address to your profile.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save wallet address.");
    }
  }

  return (
    <section className="space-y-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Wallet + profile</p>
        <h2 className="text-2xl">Connect an EVM wallet, store your bidder profile</h2>
        <p className="text-sm text-white/65">
          This app records the Base Sepolia wallet you want attached to bidding, listings, and seller ownership.
        </p>
      </div>

      <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
        <ConnectButton
          client={getThirdwebClient()}
          wallets={getThirdwebWalletOptions()}
          chain={getMarketplaceChain()}
          connectButton={{ label: "Connect Base wallet", className: "!rounded-full !bg-white !text-black !px-5 !py-3 !font-semibold" }}
        />
      </div>

      <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">
            {connectedWallet ? "Wallet connected" : "Wallet not connected"}
          </p>
          {connectedWallet ? (
            <p className="break-all text-xs text-white/55">{connectedWallet}</p>
          ) : null}
          <p className="text-sm font-medium text-white">
            {sessionLoaded ? session?.email ?? "No app profile signed in" : "Checking app profile..."}
          </p>
          <p className="text-sm text-white/55">
            Bidding, Seller Hub, and marketplace actions can use either your connected wallet or your saved app profile wallet.
          </p>
        </div>

        <input
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
          className="field-input"
          placeholder="Paste a Base Sepolia wallet address"
          spellCheck={false}
        />
        {activeAccount?.address && !connectedWallet ? (
          <p className="text-xs text-white/45">
            Your connected thirdweb wallet is not exposing an EVM address here, so paste the wallet you want to save.
          </p>
        ) : null}
        {canSaveToProfile ? (
          <button type="button" onClick={saveWalletAddress} className="button-secondary w-full">
            {connectedWallet ? "Save connected wallet to profile" : "Save wallet to profile"}
          </button>
        ) : connectedWallet ? (
          <Link href="/seller" className="button-secondary w-full text-center">
            Continue with wallet
          </Link>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/login" className="button-secondary text-center">
              Log in
            </Link>
            <Link href="/signup" className="button-secondary text-center">
              Create profile
            </Link>
          </div>
        )}
      </div>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : null}
    </section>
  );
}
