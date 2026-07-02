-- Align the persisted artwork shape with the current Seller Hub and Thirdweb flows.
-- The original auction-house schema predates wallet-owned drafts and onchain listing metadata.

alter table public.artworks
  add column if not exists owner_user_id uuid,
  add column if not exists seller_wallet text,
  add column if not exists image_url text,
  add column if not exists provenance_text text,
  add column if not exists reserve_price_lamports bigint,
  add column if not exists seller_flow_status text,
  add column if not exists sync_status text,
  add column if not exists thirdweb_provider text,
  add column if not exists thirdweb_chain text,
  add column if not exists thirdweb_contract_address text,
  add column if not exists thirdweb_token_id text,
  add column if not exists thirdweb_asset_url text,
  add column if not exists thirdweb_listing_id text,
  add column if not exists thirdweb_listing_url text;

alter table public.artworks
  alter column seller_flow_status set default 'draft';

alter table public.artworks
  drop constraint if exists artworks_status_check;

alter table public.artworks
  add constraint artworks_status_check
  check (status in ('draft', 'upcoming', 'live', 'sold', 'passed'));

alter table public.artworks
  drop constraint if exists artworks_seller_flow_status_check;

alter table public.artworks
  add constraint artworks_seller_flow_status_check
  check (
    seller_flow_status is null
    or seller_flow_status in ('draft', 'prepared', 'mint_confirmed', 'listing_confirmed', 'in_auction')
  );

create index if not exists artworks_owner_user_id_idx on public.artworks(owner_user_id);
create index if not exists artworks_seller_wallet_idx on public.artworks(seller_wallet);
create index if not exists artworks_thirdweb_listing_id_idx on public.artworks(thirdweb_listing_id);
