"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { getThirdwebClient } from "@/lib/thirdweb";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/auctions", label: "Auctions" },
  { href: "/seller", label: "Seller Hub" },
  { href: "/submit", label: "List Art" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const activeAccount = useActiveAccount();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#c9a227]/20 bg-[#0a0a0c]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#c9a227] to-[#e8c547]" />
          <span className="font-serif text-lg font-semibold tracking-wide text-white">
            RealArt Auctions
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-white/60 hover:text-[#e8c547] transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ConnectButton
            client={getThirdwebClient()}
            wallets={[inAppWallet(), createWallet("io.metamask"), createWallet("com.coinbase.wallet")]}
            connectButton={{ label: activeAccount ? "Connected" : "Connect Wallet", className: "!rounded-full !bg-[#c9a227] !text-black !px-5 !py-2.5 !text-sm !font-semibold hover:!bg-[#e8c547]" }}
          />
          <Link href="/seller" className="button-primary px-5 py-2.5 text-sm">
            Seller Hub
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#c9a227]/30 text-[#e8c547] transition-colors hover:bg-[#c9a227]/10 md:hidden"
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#c9a227]/20 bg-[#0a0a0c]/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-[#c9a227]/10 hover:text-[#e8c547]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 pt-2 border-t border-[#c9a227]/20">
              <ConnectButton
                client={getThirdwebClient()}
                wallets={[inAppWallet(), createWallet("io.metamask"), createWallet("com.coinbase.wallet")]}
                connectButton={{ label: activeAccount ? "Connected" : "Connect Wallet", className: "!rounded-2xl !bg-[#c9a227] !text-black !px-4 !py-3 !text-sm !font-semibold w-full hover:!bg-[#e8c547]" }}
              />
            </div>
            <Link
              href="/seller"
              onClick={() => setOpen(false)}
              className="button-primary px-4 py-3 text-sm"
            >
              Seller Hub
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
