create extension if not exists pgcrypto;

create table if not exists public.offchain_auctions (
  id uuid primary key default gen_random_uuid(),
  seller_wallet text not null,
  title text not null,
  description text not null,
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

create table if not exists public.offchain_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.offchain_auctions(id) on delete cascade,
  bidder_wallet text not null,
  amount_lamports bigint not null check (amount_lamports > 0),
  is_winning boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.offchain_auctions
  add constraint offchain_auctions_winner_bid_fk
  foreign key (winner_bid_id) references public.offchain_bids(id) on delete set null;

create index if not exists offchain_auctions_status_idx on public.offchain_auctions(status, created_at desc);
create index if not exists offchain_bids_auction_idx on public.offchain_bids(auction_id, amount_lamports desc, created_at asc);

create unique index if not exists offchain_bids_single_winner_idx on public.offchain_bids(auction_id) where is_winning;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_offchain_auctions_updated_at on public.offchain_auctions;
create trigger trg_offchain_auctions_updated_at
before update on public.offchain_auctions
for each row execute function public.set_updated_at();
