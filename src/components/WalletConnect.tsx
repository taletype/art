"use client";

import { useEffect, useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getThirdwebClient } from "@/lib/thirdweb";

type SessionState = {
  email: string | null;
  walletAddress: string | null;
} | null;

export default function WalletConnect() {
  const activeAccount = useActiveAccount();
  const [session, setSession] = useState<SessionState>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setSession(null);
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
    }

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void hydrate();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (activeAccount?.address) {
      setWalletAddress(activeAccount.address);
    }
  }, [activeAccount?.address]);

  async function saveWalletAddress() {
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.updateUser({
        data: {
          wallet_address: walletAddress.trim() || null,
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
      setMessage("Saved wallet address to your profile.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save wallet address.");
    }
  }

  return (
    <section className="space-y-5 rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Wallet + profile</p>
        <h2 className="text-2xl">Connect thirdweb wallet, store bidder profile</h2>
        <p className="text-sm text-white/65">
          Off-chain auctions keep bidding in Supabase, and connected thirdweb wallets should still map cleanly into your bidder profile.
        </p>
      </div>

      <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
        <ConnectButton
          client={getThirdwebClient()}
          wallets={[inAppWallet(), createWallet("io.metamask"), createWallet("com.coinbase.wallet")]}
          connectButton={{ label: "Connect with Thirdweb", className: "!rounded-full !bg-white !text-black !px-5 !py-3 !font-semibold" }}
        />
      </div>

      <div className="space-y-3 rounded-[1.4rem] border border-white/10 bg-black/20 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">{session?.email ?? "Not logged in"}</p>
          <p className="text-sm text-white/55">Save the wallet you want attached to bids, auction ownership, and settlement records.</p>
        </div>

        <input
          value={walletAddress}
          onChange={(event) => setWalletAddress(event.target.value)}
          className="field-input"
          placeholder="0x... or other connected wallet address"
        />
        <button type="button" onClick={saveWalletAddress} className="button-secondary w-full">
          {activeAccount?.address ? "Save connected wallet" : "Save wallet"}
        </button>
      </div>

      {message ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{message}</p>
      ) : null}
    </section>
  );
}
