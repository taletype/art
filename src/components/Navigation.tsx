"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { getThirdwebClient } from "@/lib/thirdweb";
import { getMarketplaceChain } from "@/lib/thirdweb-config";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/auctions", label: "Auctions" },
  { href: "/seller", label: "Seller Hub" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const activeAccount = useActiveAccount();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#d4af37]/20 bg-[#050507]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#d4af37] via-[#e8c547] to-[#d4af37] shadow-lg shadow-[#d4af37]/20 group-hover:shadow-[#d4af37]/40 transition-all duration-300" />
          <span className="font-serif text-lg font-semibold tracking-wide text-white group-hover:text-[#f0d46e] transition-colors">
            HUMAN_ Arts
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium text-white/70 hover:text-[#f0d46e] transition-colors duration-200 relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-[#d4af37] after:to-[#e8c547] hover:after:w-full after:transition-all after:duration-300">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ConnectButton
            client={getThirdwebClient()}
            wallets={getThirdwebWalletOptions()}
            chain={getMarketplaceChain()}
            connectButton={{ label: activeAccount ? "Wallet connected" : "Connect Base wallet", className: "!rounded-full !bg-gradient-to-r !from-[#d4af37] !via-[#e8c547] !to-[#d4af37] !text-black !px-5 !py-2.5 !text-sm !font-semibold hover:!shadow-lg hover:!shadow-[#d4af37]/25 transition-all duration-300" }}
          />
          <Link href="/seller" className="button-secondary px-5 py-2.5 text-sm">
            Seller Hub
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d4af37]/30 text-[#f0d46e] transition-all duration-200 hover:bg-[#d4af37]/10 hover:shadow-md hover:shadow-[#d4af37]/10 md:hidden"
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[#d4af37]/20 bg-[#050507]/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-[#d4af37]/10 hover:text-[#f0d46e]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 pt-2 border-t border-[#d4af37]/20">
              <ConnectButton
                client={getThirdwebClient()}
                wallets={getThirdwebWalletOptions()}
                chain={getMarketplaceChain()}
                connectButton={{ label: activeAccount ? "Wallet connected" : "Connect Base wallet", className: "!rounded-2xl !bg-gradient-to-r !from-[#d4af37] !via-[#e8c547] !to-[#d4af37] !text-black !px-4 !py-3 !text-sm !font-semibold w-full hover:!shadow-lg hover:!shadow-[#d4af37]/25 transition-all duration-300" }}
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
