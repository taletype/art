# Production readiness guardrails

This project currently supports a marketplace MVP and local/readiness validation flows. Before treating the Seller Hub or marketplace APIs as production-grade, keep these constraints visible:

## Seller Hub write authorization

`src/app/api/artworks/route.ts` supports wallet-mode draft, mint, and listing updates by reading a submitted `sellerWallet` / `seller_wallet` value when there is no authenticated Supabase user. The route then uses the admin Supabase client and filters updates by that wallet address.

That is useful for local wallet-mode testing, but it is not a production authorization boundary. A caller who knows an artwork ID and seller wallet can attempt mutable artwork updates unless another deployment layer blocks the request.

Before production exposure, replace this trust model with one of these server-verifiable checks:

- Require a Supabase session whose user owns the artwork or has a linked matching wallet.
- Require a signed wallet challenge and verify the signature server-side before allowing wallet-mode writes.
- Gate write routes behind an explicit server-side bearer token or equivalent protected backend path until signed wallet auth exists.

## Current safe operating assumption

Treat unauthenticated wallet-mode Seller Hub writes as testnet/local tooling only. Do not rely on `sellerWallet` request fields alone for production access control.
