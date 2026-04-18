create extension if not exists pgcrypto;

-- Auctions table
create table if not exists public.offchain_auctions (
  id uuid primary key default gen_random_uuid(),
  seller_wallet text not null,
  title text not null,
  description text,
  asset_url text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  start_price_lamports bigint not null check (start_price_lamports > 0),
  min_increment_lamports bigint not null check (min_increment_lamports > 0),
  status text not null default 'draft' check (status in ('draft', 'live', 'ended', 'settled', 'cancelled')),
  winner_bid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Bids table
create table if not exists public.offchain_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.offchain_auctions(id) on delete cascade,
  bidder_wallet text not null,
  amount_lamports bigint not null check (amount_lamports > 0),
  is_winning boolean not null default false,
  created_at timestamptz not null default now()
);

-- Artworks table
create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist_name text not null,
  artist_handle text,
  artist_wallet text not null,
  price_sol numeric not null,
  category text,
  medium text,
  edition text,
  year integer,
  description text,
  story text,
  collector_note text,
  availability text,
  background text,
  accent text,
  evidence_labels text[],
  sale_id uuid,
  lot_number integer,
  estimate_low_sol numeric,
  estimate_high_sol numeric,
  reserve_sol numeric,
  current_bid_sol numeric default 0,
  minimum_next_bid_sol numeric,
  bid_count integer default 0,
  watch_count integer default 0,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'sold', 'passed')),
  closes_at timestamptz,
  condition_report text,
  provenance_statement text,
  authenticity_statement text,
  buyer_premium_bps integer default 800,
  platform_seller_commission_bps integer default 700,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sales table
create table if not exists public.auction_sales (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  curator_name text,
  curator_note text,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  hero_lot_id uuid,
  status text not null default 'preview' check (status in ('preview', 'live', 'closed')),
  category text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

-- Creators table
create table if not exists public.creators (
  wallet text primary key,
  name text not null,
  handle text,
  location text,
  discipline text,
  bio text,
  hero_statement text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Purchase states table
create table if not exists public.purchase_states (
  idempotency_key text primary key,
  status text not null check (
    status in (
      'NEEDS_FUNDING',
      'READY_TO_PURCHASE',
      'TX_PREPARED',
      'TX_CONFIRMED',
      'FAILED'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tx_signature text,
  error text,
  tx_context jsonb
);

-- Foreign keys and constraints
alter table public.offchain_auctions
  add constraint offchain_auctions_winner_bid_fk
  foreign key (winner_bid_id) references public.offchain_bids(id) on delete set null;

alter table public.artworks
  add constraint artworks_sale_fk
  foreign key (sale_id) references public.auction_sales(id) on delete set null;

alter table public.auction_sales
  add constraint auction_sales_hero_lot_fk
  foreign key (hero_lot_id) references public.artworks(id) on delete set null;

-- Indexes
create index if not exists offchain_auctions_status_idx on public.offchain_auctions(status, created_at desc);
create index if not exists offchain_auctions_seller_wallet_idx on public.offchain_auctions(seller_wallet);
create index if not exists offchain_bids_auction_idx on public.offchain_bids(auction_id, amount_lamports desc, created_at asc);
create index if not exists offchain_bids_bidder_wallet_idx on public.offchain_bids(bidder_wallet);
create index if not exists artworks_sale_id_idx on public.artworks(sale_id);
create index if not exists artworks_status_idx on public.artworks(status, created_at desc);
create index if not exists artworks_artist_wallet_idx on public.artworks(artist_wallet);
create index if not exists auction_sales_status_idx on public.auction_sales(status, opens_at desc);
create index if not exists auction_sales_hero_lot_idx on public.auction_sales(hero_lot_id);
create index if not exists purchase_states_status_updated_at_idx on public.purchase_states(status, updated_at desc);

-- Unique index for winning bids
create unique index if not exists offchain_bids_single_winner_idx on public.offchain_bids(auction_id) where is_winning;

-- Updated at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers for updated_at
drop trigger if exists trg_offchain_auctions_updated_at on public.offchain_auctions;
create trigger trg_offchain_auctions_updated_at
before update on public.offchain_auctions
for each row execute function public.set_updated_at();

drop trigger if exists trg_artworks_updated_at on public.artworks;
create trigger trg_artworks_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();

drop trigger if exists trg_auction_sales_updated_at on public.auction_sales;
create trigger trg_auction_sales_updated_at
before update on public.auction_sales
for each row execute function public.set_updated_at();

drop trigger if exists trg_creators_updated_at on public.creators;
create trigger trg_creators_updated_at
before update on public.creators
for each row execute function public.set_updated_at();

drop trigger if exists trg_purchase_states_updated_at on public.purchase_states;
create trigger trg_purchase_states_updated_at
before update on public.purchase_states
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.offchain_auctions enable row level security;
alter table public.offchain_bids enable row level security;
alter table public.artworks enable row level security;
alter table public.auction_sales enable row level security;
alter table public.creators enable row level security;
alter table public.purchase_states enable row level security;

-- Service role policies (full access for backend)
drop policy if exists "Service role manages offchain_auctions" on public.offchain_auctions;
create policy "Service role manages offchain_auctions"
  on public.offchain_auctions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages offchain_bids" on public.offchain_bids;
create policy "Service role manages offchain_bids"
  on public.offchain_bids
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages artworks" on public.artworks;
create policy "Service role manages artworks"
  on public.artworks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages auction_sales" on public.auction_sales;
create policy "Service role manages auction_sales"
  on public.auction_sales
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages creators" on public.creators;
create policy "Service role manages creators"
  on public.creators
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages purchase_states" on public.purchase_states;
create policy "Service role manages purchase_states"
  on public.purchase_states
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Public read policies (for frontend)
drop policy if exists "Public read offchain_auctions" on public.offchain_auctions;
create policy "Public read offchain_auctions"
  on public.offchain_auctions
  for select
  using (true);

drop policy if exists "Public read offchain_bids" on public.offchain_bids;
create policy "Public read offchain_bids"
  on public.offchain_bids
  for select
  using (true);

drop policy if exists "Public read artworks" on public.artworks;
create policy "Public read artworks"
  on public.artworks
  for select
  using (true);

drop policy if exists "Public read auction_sales" on public.auction_sales;
create policy "Public read auction_sales"
  on public.auction_sales
  for select
  using (true);

drop policy if exists "Public read creators" on public.creators;
create policy "Public read creators"
  on public.creators
  for select
  using (true);
