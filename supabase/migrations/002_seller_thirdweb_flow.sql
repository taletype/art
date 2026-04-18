alter table public.artworks
  add column if not exists owner_user_id uuid,
  add column if not exists seller_wallet text,
  add column if not exists image_url text,
  add column if not exists provenance_text text,
  add column if not exists reserve_price_lamports bigint,
  add column if not exists seller_flow_status text default 'draft',
  add column if not exists sync_status text default 'pending',
  add column if not exists thirdweb_provider text,
  add column if not exists thirdweb_chain text,
  add column if not exists thirdweb_contract_address text,
  add column if not exists thirdweb_token_id text,
  add column if not exists thirdweb_asset_url text,
  add column if not exists thirdweb_listing_id text,
  add column if not exists thirdweb_listing_url text;

alter table public.offchain_auctions
  add column if not exists artwork_id uuid references public.artworks(id) on delete set null,
  add column if not exists owner_user_id uuid,
  add column if not exists auction_source text default 'thirdweb',
  add column if not exists thirdweb_provider text,
  add column if not exists thirdweb_chain text,
  add column if not exists thirdweb_contract_address text,
  add column if not exists thirdweb_listing_id text,
  add column if not exists thirdweb_listing_url text,
  add column if not exists sync_status text default 'pending';

create index if not exists artworks_owner_user_id_idx on public.artworks(owner_user_id, created_at desc);
create index if not exists offchain_auctions_artwork_id_idx on public.offchain_auctions(artwork_id);
