# HUMAN_ Arts on Base Sepolia

This repo is a Next.js + Thirdweb marketplace MVP for HUMAN_ Arts: a premium digital auction house for culturally significant overlooked artists creating human-made work. It combines provenance-aware artist consignment, curated sale catalogs, Base Sepolia marketplace listings, auction bidding, and direct buyouts.

HUMAN_ Arts is human-made only. AI-generated artwork, AI-assisted final artwork, and synthetic artist claims are not eligible for auction placement.

## Current product surface

- `/` is the auction-house landing page with featured timed sales, human-made auction lots, artist spotlighting, and trust messaging.
- `/sales/[saleId]` is a formal sale catalog with curator note, sale calendar, hero lot, and lot grid.
- `/art/[assetId]` is the lot detail page with estimates, reserve, condition report, provenance context, buyer premium disclosure, and marketplace handoff.
- `/submit` is the artist consignment workflow for drafting metadata, attaching human-authorship evidence, simulating review, and testing mint/list preparation.
- `/creator/[wallet]` is the artist profile and consigned works view.
- `/auctions` and `/auctions/[id]` read live auction and direct listing state from the configured Thirdweb marketplace contract.
- `/seller` creates artwork drafts in Supabase, then mints ERC-721s and publishes either auction or direct listings to the Thirdweb marketplace.

## Tech stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS
- Thirdweb v5 marketplace + ERC-721 extensions
- Supabase helpers for browser, server, and admin access
- Vitest for unit coverage

## Supabase status

Supabase is now wired into local project configuration through `.env.local` and shared helpers in `src/lib/supabase`.

- Browser-safe access should use the publishable key via `getSupabaseBrowserClient()`.
- Server-side RLS-aware access can use `createSupabaseServerClient()`.
- Admin-only operations should use `createSupabaseAdminClient()` and stay on the server.
- Postgres connection strings are exposed through `DATABASE_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL`.

What is still not migrated:
- Human-made provenance verification is still mock-driven.

Purchase-state persistence now prefers Supabase through `purchase_states` and falls back to the local file store if Supabase is not configured or unavailable.

## What works end-to-end on Base Sepolia

- Seller Hub can create artwork drafts in Supabase.
- Sellers can mint ERC-721 NFTs to their connected wallet via the configured Thirdweb collection contract.
- Sellers can publish English auctions or direct listings to the configured Thirdweb marketplace contract.
- Collectors can connect an EVM wallet, place bids on auctions, buy out auctions, or purchase direct listings from the live marketplace pages.

## Required env vars by flow

### Required for Thirdweb marketplace UX
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
- `NEXT_PUBLIC_THIRDWEB_CHAIN`
- `NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT`
- `NEXT_PUBLIC_THIRDWEB_NFT_COLLECTION_CONTRACT`

### Required for Thirdweb webhooks
- `THIRDWEB_WEBHOOK_SECRET`

### Optional storage adapter
- `STORAGE_WRITE_ENDPOINT`
- `STORAGE_BEARER_TOKEN`

### Optional durable store overrides
- `PURCHASE_STATE_FILE` (defaults to `.data/purchase-state.json`)
- `PURCHASE_STATE_BACKEND` (`supabase` by default, set `file` to force local file mode)
- `PURCHASE_STATE_TABLE` (defaults to `purchase_states`)

### Supabase / Postgres
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for server admin flows
- `DATABASE_URL` or `POSTGRES_URL` for direct database access

## Local development

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm test
npm run dev
```

Notes:
- `npm test` runs the Vitest suite in `src/lib/__tests__`.
- `npm run lint` is currently a placeholder and does not perform real linting yet.
- `npm run readiness:v2:run` writes readiness artifacts to `artifacts/readiness-v2` by default.
- `npm run seed:mock-auctions` still seeds legacy Supabase auction rows, but the live marketplace UI now reads from the configured Thirdweb contracts.
- Apply `supabase/migrations/001_purchase_states.sql` before relying on Supabase-backed purchase recovery in shared environments.
- Apply `supabase/migrations/002_curated_auction_house.sql` before relying on Supabase-backed auction artists, sales, lots, collectors, bids, or watchlists.
- Legacy off-chain auction migrations can remain in the database for historical data, but the live marketplace flow no longer depends on `/api/auctions*` as the bidding source of truth.

## Primary user flow

1. Submit human-authorship evidence/provenance at `/submit`.
2. Use the mock review UI to move the asset to `VERIFIED_HUMAN`.
3. Curate the artwork into a named timed sale and lot record.
4. Open Seller Hub and mint the artwork into the configured ERC-721 collection.
5. From Seller Hub, publish either an English auction or a direct listing to the marketplace contract.
6. Open `/auctions` or `/auctions/[id]` and place a bid or purchase directly with a connected wallet.
7. Refresh the listing page after confirmation to see the latest onchain state.

## Debugging common blockers

- `MISSING_ENV`: set the env var named in `blockingIssueDetails[].details.envVar`.
- Missing marketplace data: verify `NEXT_PUBLIC_THIRDWEB_MARKETPLACE_CONTRACT` and `NEXT_PUBLIC_THIRDWEB_CHAIN`.
- Mint/list failures: verify the connected wallet can mint on the configured ERC-721 contract and list on the configured marketplace.
- Human-made policy blockers: complete evidence review and move the work to `VERIFIED_HUMAN`; AI-generated or AI-assisted artwork should be rejected rather than prepared.

## Non-production notes

- Durable store is file-backed local state, not multi-instance safe.
- Admin/reviewer auth remains mock.
- Operational hardening (queues/retries/observability/abuse controls) is still pending.

## Readiness V2 artifact bundle

This repo includes a local readiness runner at [scripts/readiness-v2-run.mjs](/Users/ricky/Desktop/art/scripts/readiness-v2-run.mjs).

It produces an artifact bundle in `artifacts/readiness-v2` unless `READINESS_ARTIFACT_DIR` is overridden.

The bundle includes:
- `funded-binary-proof-summary.json`
- `funded-multi-proof-summary.json`
- `deploy-candidate-smoke-evidence.json`
- `deploy-candidate-smoke-evidence.md`
- `readiness-verdict.json`
- `readiness-verdict.md`
- `readiness-run-summary.json`
- `bundle-complete.json`
