# HUMAN_ Arts on Solana

This repo is a Next.js + Solana devnet MVP for HUMAN_ Arts: a premium digital auction house for culturally significant overlooked artists creating human-made work. It combines provenance-aware artist consignment, curated sale catalogs, bid preparation, SDK-backed mint/listing preparation, and a recovery-friendly purchase flow.

HUMAN_ Arts is human-made only. AI-generated artwork, AI-assisted final artwork, and synthetic artist claims are not eligible for auction placement.

## Current product surface

- `/` is the auction-house landing page with featured timed sales, human-made auction lots, artist spotlighting, and trust messaging.
- `/sales/[saleId]` is a formal sale catalog with curator note, sale calendar, hero lot, and lot grid.
- `/art/[assetId]` is the lot detail page with estimates, reserve, condition report, provenance context, buyer premium disclosure, and Solana bid preparation.
- `/submit` is the artist consignment workflow for drafting metadata, attaching human-authorship evidence, simulating review, and testing mint/list preparation.
- `/creator/[wallet]` is the artist profile and consigned works view.
- `/api/auction/bid` validates collector registration, sale window, bid increment, and English auction env before any wallet-signed bid transaction is emitted.

## Tech stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS
- Solana Web3 + Metaplex Core + Auction House
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

## What works end-to-end on Devnet (with env + RPC)

- **Metaplex Core mint prepare** (`/api/mint`) using `mpl-core` `createV1` instruction building after `VERIFIED_HUMAN` review.
- **Auction House list prepare** (`/api/list`) using AH `sell` instruction building.
- **Auction House purchase prepare** (`/api/purchase`) using AH `buy + executeSale` instruction building.
- **Purchase confirm** remains RPC-verified before `TX_CONFIRMED`.

All prepare responses include:
- `blockingErrors[]` (human-readable)
- `blockingIssueDetails[]` (typed, actionable)
- `warnings[]`
- `txInspection` (network/payer/programIds/accounts/notes)

## Critical identifier rule

For Auction House list/purchase flows, **`assetId` must be a mint public key**.

If `assetId` is not a valid mint-shaped pubkey, the API returns typed blockers (`INVALID_ASSET_ID` / `INVALID_PUBLIC_KEY`) and does not emit unsigned tx payloads.

## Known unsupported branch

- Non-native treasury mint is not wired in this MVP.
- Supported treasury mint right now: `So11111111111111111111111111111111111111112` (native SOL).
- If you pass a different treasury mint, you get `UNSUPPORTED_BRANCH` blockers with guidance to extend account/payment mapping in `src/lib/auctionHouse.ts`.

## Required env vars by flow

### Required for SDK-backed mint
- `SOLANA_RPC_URL`
- `SOLANA_METAPLEX_CORE_PROGRAM_ID`

### Required for SDK-backed list/purchase
- `SOLANA_RPC_URL`
- `SOLANA_AUCTION_HOUSE_ADDRESS`
- `SOLANA_AUCTION_HOUSE_AUTHORITY`
- `SOLANA_AUCTION_HOUSE_FEE_ACCOUNT`
- `SOLANA_AUCTION_HOUSE_TREASURY_ACCOUNT`

### Required for client UX
- `NEXT_PUBLIC_SOLANA_RPC_URL`
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`

### Required for Thirdweb webhooks
- `THIRDWEB_WEBHOOK_SECRET`

### Optional storage adapter
- `STORAGE_WRITE_ENDPOINT`
- `STORAGE_BEARER_TOKEN`

### Optional durable store overrides
- `PURCHASE_STATE_FILE` (defaults to `.data/purchase-state.json`)
- `PURCHASE_STATE_BACKEND` (`supabase` by default, set `file` to force local file mode)
- `PURCHASE_STATE_TABLE` (defaults to `purchase_states`)

### Required for Solana-native English auction bid prepare
- `SOLANA_ENGLISH_AUCTION_PROGRAM_ID`
- `SOLANA_AUCTION_ESCROW_AUTHORITY`
- `SOLANA_AUCTION_PLATFORM_FEE_ACCOUNT`

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
- Apply `supabase/migrations/001_purchase_states.sql` before relying on Supabase-backed purchase recovery in shared environments.
- Apply `supabase/migrations/002_curated_auction_house.sql` before relying on Supabase-backed auction artists, sales, lots, collectors, bids, or watchlists.

## Primary user flow

1. Submit human-authorship evidence/provenance at `/submit`.
2. Use the mock review UI to move the asset to `VERIFIED_HUMAN`.
3. Curate the artwork into a named timed sale and lot record.
4. Call mint prepare and inspect the response:
   - if `blockingErrors` non-empty: fix env/RPC/input
   - if `unsignedTxBase64` present: sign/broadcast
5. Open `/sales/[saleId]` or `/art/[assetId]` and prepare a bid from the lot panel.
6. Resolve any English auction blockers, simulate, then ask the buyer wallet to sign.
7. Confirm/poll until the on-chain bid and settlement state are reflected.

## Debugging common blockers

- `MISSING_ENV`: set the env var named in `blockingIssueDetails[].details.envVar`.
- `INVALID_ASSET_ID` / `INVALID_PUBLIC_KEY`: pass mint pubkey as `assetId` for AH routes.
- `UNSUPPORTED_BRANCH`: treasury mint branch not implemented in this MVP.
- `RPC_UNAVAILABLE`: check `SOLANA_RPC_URL`, connectivity, and provider health.
- `SDK_BUILD_FAILED`: inspect account/program config and payload values in `txInspection.accounts`.
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
