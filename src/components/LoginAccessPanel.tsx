"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getThirdwebClient } from "@/lib/thirdweb";
import { getMarketplaceChain, getMarketplaceChainLabel } from "@/lib/thirdweb-config";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";

type SessionState = {
  email: string | null;
};

export default function LoginAccessPanel() {
  const activeAccount = useActiveAccount();
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setSession(null);
        return;
      }

      setSession({
        email: data.user.email ?? null,
      });
    }

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void hydrate();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <section className="space-y-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl shadow-black/30">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Quick access</p>
        <h2 className="text-2xl text-white">Use Thirdweb for wallet-first bidding</h2>
        <p className="text-sm leading-7 text-white/65">
          Connecting a wallet is enough for browsing auctions and placing bids on {getMarketplaceChainLabel()}. Seller Hub actions still require an app account so your profile and inventory stay attached to you.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
        <ConnectButton
          client={getThirdwebClient()}
          wallets={getThirdwebWalletOptions()}
          chain={getMarketplaceChain()}
          connectButton={{
            label: activeAccount ? "Wallet connected" : "Connect with Thirdweb",
            className: "!w-full !rounded-full !bg-white !px-5 !py-3 !font-semibold !text-black",
          }}
        />
      </div>

      {activeAccount ? (
        <div className="rounded-[1.5rem] border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 text-sm text-white/80">
          <p className="font-medium text-white">Connected wallet</p>
          <p className="mt-1 break-all text-white/65">{activeAccount.address}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href="/auctions" className="button-primary text-center">
              Go to auctions
            </Link>
            <Link href="/signup" className="button-secondary text-center">
              Create seller account
            </Link>
          </div>
        </div>
      ) : null}

      {session ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-white/75">
          <p className="font-medium text-white">App session active</p>
          <p className="mt-1 text-white/65">{session.email ?? "Signed in"}</p>
          <Link href="/seller" className="button-secondary mt-4 block text-center">
            Continue to Seller Hub
          </Link>
        </div>
      ) : null}
    </section>
  );
}
