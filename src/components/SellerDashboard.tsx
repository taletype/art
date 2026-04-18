"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SellerArtwork = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  seller_flow_status: string | null;
  sync_status: string | null;
  thirdweb_listing_id: string | null;
};

type SellerDashboardProps = {
  email: string | null;
  walletAddress: string | null;
  artworks: SellerArtwork[];
};

function solToLamports(value: string) {
  return Math.round(Number(value || "0") * 1_000_000_000);
}

export default function SellerDashboard({ email, walletAddress, artworks }: SellerDashboardProps) {
  const [launchState, setLaunchState] = useState<Record<string, { pending: boolean; message: string | null }>>({});

  const preparedCount = useMemo(
    () => artworks.filter((artwork) => artwork.seller_flow_status === "prepared").length,
    [artworks],
  );

  async function prepareArtwork(artworkId: string) {
    setLaunchState((current) => ({
      ...current,
      [artworkId]: { pending: true, message: null },
    }));

    try {
      const response = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to prepare artwork.");
      }

      setLaunchState((current) => ({
        ...current,
        [artworkId]: { pending: false, message: "Artwork prepared with thirdweb metadata." },
      }));
      window.location.reload();
    } catch (error) {
      setLaunchState((current) => ({
        ...current,
        [artworkId]: { pending: false, message: error instanceof Error ? error.message : "Unable to prepare artwork." },
      }));
    }
  }

  async function launchAuction(artworkId: string) {
    const startsAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setLaunchState((current) => ({
      ...current,
      [artworkId]: { pending: true, message: null },
    }));

    try {
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId,
          startsAt,
          endsAt,
          startPriceLamports: solToLamports("1"),
          minIncrementLamports: solToLamports("0.1"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Unable to launch auction.");
      }

      setLaunchState((current) => ({
        ...current,
        [artworkId]: { pending: false, message: "Auction launched and mirrored locally." },
      }));
      window.location.reload();
    } catch (error) {
      setLaunchState((current) => ({
        ...current,
        [artworkId]: { pending: false, message: error instanceof Error ? error.message : "Unable to launch auction." },
      }));
    }
  }

  return (
    <main className="pb-20 pt-28">
      <section className="section-shell space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <p className="eyebrow">Seller hub</p>
            <h1 className="text-5xl leading-tight sm:text-6xl">Create the account, link the wallet, launch the auction.</h1>
            <p className="max-w-3xl text-lg leading-8 text-white/68">
              Supabase owns your seller profile. Thirdweb owns wallet identity and auction rails. This dashboard keeps both in one place.
            </p>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Seller status</p>
            <dl className="mt-4 space-y-3 text-sm text-white/75">
              <div className="flex justify-between gap-4">
                <dt>Account</dt>
                <dd>{email ?? "Not signed in"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Linked wallet</dt>
                <dd className="text-right">{walletAddress ?? "Connect with thirdweb"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Prepared artworks</dt>
                <dd>{preparedCount}</dd>
              </div>
            </dl>
            <Link href="/submit" className="button-primary mt-6 w-full text-center">
              Add artwork
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2 className="text-3xl">Your artworks</h2>
            </div>
          </div>

          {artworks.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {artworks.map((artwork) => {
                const state = launchState[artwork.id];
                return (
                  <article key={artwork.id} className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5">
                    <div
                      className="aspect-[4/3] rounded-[1.3rem] border border-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)), url(${artwork.image_url ?? ""})` }}
                    />
                    <div className="mt-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl">{artwork.title}</h3>
                        <span className="status-pill">{artwork.seller_flow_status ?? "draft"}</span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-white/65">{artwork.description}</p>
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/55">
                        Sync status: {artwork.sync_status ?? "pending"}
                      </div>
                      <div className="grid gap-3">
                        <button
                          type="button"
                          onClick={() => prepareArtwork(artwork.id)}
                          disabled={state?.pending || !walletAddress}
                          className="button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {state?.pending ? "Working..." : "Prepare with thirdweb"}
                        </button>
                        <button
                          type="button"
                          onClick={() => launchAuction(artwork.id)}
                          disabled={state?.pending || !walletAddress || artwork.seller_flow_status !== "prepared"}
                          className="button-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Launch auction
                        </button>
                        {artwork.thirdweb_listing_id ? (
                          <Link href={`/auctions?focus=${artwork.thirdweb_listing_id}`} className="text-sm text-[#e8c547] underline underline-offset-4">
                            View linked auction
                          </Link>
                        ) : null}
                        {state?.message ? (
                          <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80">{state.message}</p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
              <h3 className="text-2xl">No artworks yet</h3>
              <p className="mt-3 text-sm text-white/60">Create your first draft, prepare it with thirdweb, then launch the auction from here.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
