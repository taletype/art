"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/#featured", label: "Explore" },
  { href: "/#creators", label: "Creators" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/submit", label: "Submit" },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-xl">
      <div className="section-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold tracking-[0.24em] text-[#f8deb0]">
            H_
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white">HUMAN_ Arts</p>
            <p className="text-xs uppercase tracking-[0.18em] text-white/45">Verified digital originals</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm text-white/70 transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/creator/creative-soul" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/5 hover:text-white">
            Featured creator
          </Link>
          <Link href="/submit" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#f3ead8]">
            Submit art
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white md:hidden"
        >
          <span className="text-lg">{open ? "×" : "☰"}</span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-black/90 md:hidden">
          <div className="section-shell flex flex-col gap-2 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/submit" onClick={() => setOpen(false)} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black">
              Submit art
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
