# HUMAN_ Arts on Solana (Phase 1 Devnet MVP)

This repo provides a Devnet-focused MVP for HUMAN_ Arts with strict provenance controls, SDK-backed transaction preparation, and durable server-side purchase state.

## What works end-to-end on Devnet (with env + RPC)

- **Metaplex Core mint prepare** (`/api/mint`) using `mpl-core` `createV1` instruction building.
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

### Optional storage adapter
- `STORAGE_WRITE_ENDPOINT`
- `STORAGE_BEARER_TOKEN`

### Optional durable store
- `PURCHASE_STATE_FILE` (defaults to `.data/purchase-state.json`)

## Local run

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm test
npm run dev
```

## Submit -> Review -> List -> Buy flow

1. Submit evidence/provenance at `/submit`.
2. Mark as `VERIFIED_HUMAN` in review UI.
3. Call mint prepare and inspect response:
   - if `blockingErrors` non-empty: fix env/RPC/input
   - if `unsignedTxBase64` present: sign/broadcast
4. Call list prepare with **mint pubkey as `assetId`**.
5. Call buy prepare from art page, sign/broadcast buyer tx.
6. Confirm/poll until `TX_CONFIRMED`.

## Debugging common blockers

- `MISSING_ENV`: set the env var named in `blockingIssueDetails[].details.envVar`.
- `INVALID_ASSET_ID` / `INVALID_PUBLIC_KEY`: pass mint pubkey as `assetId` for AH routes.
- `UNSUPPORTED_BRANCH`: treasury mint branch not implemented in this MVP.
- `RPC_UNAVAILABLE`: check `SOLANA_RPC_URL`, connectivity, and provider health.
- `SDK_BUILD_FAILED`: inspect account/program config and payload values in `txInspection.accounts`.

## Non-production notes

- Durable store is file-backed local state, not multi-instance safe.
- Admin/reviewer auth remains mock.
- Operational hardening (queues/retries/observability/abuse controls) is still pending.

## Readiness V2 workflow artifact bundle

Manual workflow: `.github/workflows/readiness-v2.yml`

What it now does automatically:
- runs `pnpm readiness:v2:run`
- uploads one canonical artifact bundle named `readiness-v2-bundle-<target>-<run_id>`
- writes a concise job summary with verdict, phases, smoke mode, and bundle name

Bundle includes:
- `funded-binary-proof-summary.json`
- `funded-multi-proof-summary.json`
- `deploy-candidate-smoke-evidence.json`
- `deploy-candidate-smoke-evidence.md`
- `readiness-verdict.json`
- `readiness-verdict.md`
- `readiness-run-summary.json`
- `bundle-complete.json`
