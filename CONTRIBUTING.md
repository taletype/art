# Contributing

Thanks for helping improve HUMAN_ Arts. This project is a Next.js, Thirdweb, Supabase, and Vitest marketplace app, so small focused changes are easiest to review and keep safe.

## Local setup

Use Node.js 22 to match CI. If you use `nvm`, the committed `.nvmrc` selects the right runtime.

```bash
nvm use
npm ci
cp .env.example .env.local
npm run typecheck
npm test
npm run dev
```

Fill `.env.local` with project-specific values before testing wallet, marketplace, Supabase, webhook, or storage flows. Never commit real secrets, service-role keys, bearer tokens, private connection strings, or generated local state.

## Verification before committing

Run the checks that match your change:

- `npm run check` for the full CI-equivalent typecheck, unit test, and production build sequence.
- `npm run typecheck` for TypeScript and Next.js type safety.
- `npm test` for unit coverage under `src`.
- `npm run build` for production build, routing, server component, or deployment-sensitive changes.
- `npm run readiness:v2:run` when changing readiness evidence, deployment smoke checks, or artifact bundle logic.
- Manual wallet and marketplace smoke checks when changing Seller Hub, auctions, direct listings, minting, bidding, or buyout flows.

`npm run lint` is currently a placeholder, so do not treat it as a real quality gate until linting is configured.

## Supabase and migrations

The app uses Supabase for artwork drafts and curated auction-house data. Apply the migrations documented in `README.md` before relying on those tables in a shared environment.

The legacy `/api/purchase` route is retired and returns `410 Gone`; live purchases use the Thirdweb SDK and marketplace contract directly. Do not reintroduce purchase-state persistence, local purchase-state files, or webhook-driven purchase recovery unless a task explicitly restores that retired flow.

When changing database-backed flows:

- Keep browser usage on publishable or anon keys.
- Keep service-role operations on the server.
- Avoid committing generated readiness artifacts or local `.data` files unless a task explicitly asks for them.

## Change style

Prefer small, coherent changes with tests or a clear verification note. Avoid broad rewrites, product-direction changes, or contract-address changes unless the repository context makes the need explicit.
