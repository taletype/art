"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useActiveAccount, ConnectButton } from "thirdweb/react";
import { getThirdwebClient, isThirdwebClientConfigured } from "@/lib/thirdweb";
import { getMarketplaceChain } from "@/lib/thirdweb-config";
import { getThirdwebWalletOptions } from "@/lib/thirdwebWallets";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/submit", label: "Submit" },
  { href: "/auctions", label: "Auctions" },
  { href: "/admin", label: "Admin" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const activeAccount = useActiveAccount();
  const thirdwebClient = isThirdwebClientConfigured() ? getThirdwebClient() : null;
  const isCurrentHref = (href: string) => (href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

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
          {navItems.map((item) => {
            const isCurrent = isCurrentHref(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`text-sm font-medium transition-colors duration-200 relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:bg-gradient-to-r after:from-[#d4af37] after:to-[#e8c547] hover:text-[#f0d46e] hover:after:w-full after:transition-all after:duration-300 ${
                  isCurrent ? "text-[#f0d46e] after:w-full" : "text-white/70 after:w-0"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {thirdwebClient ? (
            <ConnectButton
              client={thirdwebClient}
              wallets={getThirdwebWalletOptions()}
              chain={getMarketplaceChain()}
              connectButton={{ label: activeAccount ? "Wallet connected" : "Connect Base wallet", className: "!rounded-full !bg-gradient-to-r !from-[#d4af37] !via-[#e8c547] !to-[#d4af37] !text-black !px-5 !py-2.5 !text-sm !font-semibold hover:!shadow-lg hover:!shadow-[#d4af37]/25 transition-all duration-300" }}
            />
          ) : (
            <span className="rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-2.5 text-sm font-semibold text-[#f0d46e]">
              Wallet setup needed
            </span>
          )}
          <Link href="/seller" aria-current={isCurrentHref("/seller") ? "page" : undefined} className="button-secondary px-5 py-2.5 text-sm">
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
        <div className="border-t border-[#d4af37]/20 bg-[#050507]/95 backdrop-blur-xl md:hidden animate-fade-in">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 sm:px-6">
            {navItems.map((item) => {
              const isCurrent = isCurrentHref(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`rounded-2xl px-5 py-4 text-base font-medium transition-all duration-200 active:scale-[0.98] ${
                    isCurrent ? "bg-[#d4af37]/10 text-[#f0d46e]" : "text-white/70 hover:bg-[#d4af37]/10 hover:text-[#f0d46e]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-4 pt-4 border-t border-[#d4af37]/20">
              {thirdwebClient ? (
                <ConnectButton
                  client={thirdwebClient}
                  wallets={getThirdwebWalletOptions()}
                  chain={getMarketplaceChain()}
                  connectButton={{ label: activeAccount ? "Wallet connected" : "Connect Base wallet", className: "!rounded-2xl !bg-gradient-to-r !from-[#d4af37] !via-[#e8c547] !to-[#d4af37] !text-black !px-5 !py-4 !text-base !font-semibold w-full hover:!shadow-lg hover:!shadow-[#d4af37]/25 transition-all duration-300 active:scale-[0.98]" }}
                />
              ) : (
                <span className="flex w-full items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-4 text-base font-semibold text-[#f0d46e]">
                  Wallet setup needed
                </span>
              )}
            </div>
            <Link
              href="/seller"
              aria-current={isCurrentHref("/seller") ? "page" : undefined}
              onClick={() => setOpen(false)}
              className="button-primary px-5 py-4 text-base mt-2 active:scale-[0.98]"
            >
              Seller Hub
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
