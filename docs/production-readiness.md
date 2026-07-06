# Production readiness guardrails

This project currently supports a marketplace MVP and local/readiness validation flows. Before treating the Seller Hub or marketplace APIs as production-grade, keep these constraints visible:

## Seller Hub write authorization

`src/app/api/artworks/route.ts` supports wallet-mode draft, mint, and listing updates by reading a submitted `sellerWallet` / `seller_wallet` value when there is no authenticated Supabase user. The route then uses the admin Supabase client and filters updates by that wallet address.

That is useful for local wallet-mode testing, but it is not a production authorization boundary. A caller who knows an artwork ID and seller wallet can attempt mutable artwork updates unless another deployment layer blocks the request.

Before production exposure, replace this trust model with one of these server-verifiable checks:

- Require a Supabase session whose user owns the artwork or has a linked matching wallet.
- Require a signed wallet challenge and verify the signature server-side before allowing wallet-mode writes.
- Keep write routes behind `API_WRITE_BEARER_TOKEN` or an equivalent protected backend path until signed wallet auth exists.

## Existing deploy-time mitigations

`src/app/api/artworks/route.ts` already applies shared API guardrails to write requests:

- `API_WRITE_BEARER_TOKEN`, when set, requires callers to send a matching `Authorization: Bearer <token>` header before draft creation or artwork updates proceed.
- `API_RATE_LIMIT_MAX` and `API_RATE_LIMIT_WINDOW_MS` tune the shared per-window route limits applied to draft creation and artwork updates.

These are useful deployment controls for private testnet and readiness environments, but they are not a replacement for server-verifiable seller identity. Keep them enabled anywhere unauthenticated wallet-mode writes are reachable, and still treat signed wallet or session ownership checks as the production requirement.

## Current safe operating assumption

Treat unauthenticated wallet-mode Seller Hub writes as testnet/local tooling only. Do not rely on `sellerWallet` request fields alone for production access control.
