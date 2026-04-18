create table if not exists public.auction_artists (
  wallet text primary key,
  display_name text not null,
  handle text,
  location text,
  discipline text,
  bio text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auction_sales (
  id text primary key,
  title text not null,
  subtitle text,
  curator_name text,
  curator_note text,
  status text not null default 'preview' check (status in ('preview', 'live', 'closed')),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  hero_lot_id text,
  category text,
  location text,
  featured_rank integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.auction_lots (
  id text primary key,
  sale_id text not null references public.auction_sales(id) on delete cascade,
  artist_wallet text not null references public.auction_artists(wallet),
  lot_number integer not null,
  title text not null,
  year integer,
  medium text,
  edition text,
  description text,
  catalog_essay text,
  provenance_statement text,
  authenticity_statement text,
  condition_report text,
  image_url text,
  asset_id text,
  estimate_low_lamports bigint not null,
  estimate_high_lamports bigint not null,
  reserve_lamports bigint not null,
  minimum_bid_increment_lamports bigint not null default 100000000,
  current_bid_lamports bigint not null default 0,
  bid_count integer not null default 0,
  watch_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'live', 'sold', 'passed', 'hidden')),
  buyer_premium_bps integer not null default 800,
  seller_commission_bps integer not null default 700,
  moderation_state text not null default 'pending' check (moderation_state in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sale_id, lot_number),
  check (estimate_high_lamports >= estimate_low_lamports),
  check (reserve_lamports >= 0),
  check (buyer_premium_bps between 0 and 3000),
  check (seller_commission_bps between 0 and 3000)
);

create table if not exists public.collector_profiles (
  wallet text primary key,
  email text not null,
  display_name text not null,
  profile text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auction_bids (
  idempotency_key text primary key,
  sale_id text not null references public.auction_sales(id) on delete cascade,
  lot_id text not null references public.auction_lots(id) on delete cascade,
  bidder_wallet text not null references public.collector_profiles(wallet),
  bid_lamports bigint not null,
  buyer_premium_lamports bigint not null default 0,
  total_lamports bigint not null,
  status text not null default 'prepared' check (status in ('prepared', 'submitted', 'confirmed', 'outbid', 'failed')),
  tx_signature text,
  tx_context jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist_items (
  wallet text not null references public.collector_profiles(wallet) on delete cascade,
  lot_id text not null references public.auction_lots(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wallet, lot_id)
);

create index if not exists auction_sales_status_closes_at_idx
  on public.auction_sales (status, closes_at);

create index if not exists auction_lots_sale_status_lot_number_idx
  on public.auction_lots (sale_id, status, lot_number);

create index if not exists auction_lots_artist_status_idx
  on public.auction_lots (artist_wallet, status);

create index if not exists auction_lots_estimate_idx
  on public.auction_lots (estimate_low_lamports, estimate_high_lamports);

create index if not exists auction_bids_lot_created_at_idx
  on public.auction_bids (lot_id, created_at desc);

alter table public.auction_artists enable row level security;
alter table public.auction_sales enable row level security;
alter table public.auction_lots enable row level security;
alter table public.collector_profiles enable row level security;
alter table public.auction_bids enable row level security;
alter table public.watchlist_items enable row level security;

drop policy if exists "Public reads approved artists" on public.auction_artists;
create policy "Public reads approved artists"
  on public.auction_artists for select
  using (verification_status = 'verified' or auth.role() = 'service_role');

drop policy if exists "Public reads visible sales" on public.auction_sales;
create policy "Public reads visible sales"
  on public.auction_sales for select
  using (status in ('preview', 'live', 'closed') or auth.role() = 'service_role');

drop policy if exists "Public reads approved lots" on public.auction_lots;
create policy "Public reads approved lots"
  on public.auction_lots for select
  using (status in ('approved', 'live', 'sold', 'passed') or auth.role() = 'service_role');

drop policy if exists "Collectors read own profile" on public.collector_profiles;
create policy "Collectors read own profile"
  on public.collector_profiles for select
  using (auth.role() = 'service_role' or wallet = auth.jwt() ->> 'wallet');

drop policy if exists "Collectors manage own watchlist" on public.watchlist_items;
create policy "Collectors manage own watchlist"
  on public.watchlist_items for all
  using (auth.role() = 'service_role' or wallet = auth.jwt() ->> 'wallet')
  with check (auth.role() = 'service_role' or wallet = auth.jwt() ->> 'wallet');

drop policy if exists "Service role manages auction house tables" on public.auction_sales;
create policy "Service role manages auction house tables"
  on public.auction_sales for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages auction lots" on public.auction_lots;
create policy "Service role manages auction lots"
  on public.auction_lots for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages collectors" on public.collector_profiles;
create policy "Service role manages collectors"
  on public.collector_profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role manages bids" on public.auction_bids;
create policy "Service role manages bids"
  on public.auction_bids for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
