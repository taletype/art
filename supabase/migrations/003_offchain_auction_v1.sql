create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text not null,
  asset_url text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  start_price numeric(18, 6) not null,
  min_increment numeric(18, 6) not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'ended', 'settled', 'cancelled')),
  winner_bid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  check (start_price >= 0),
  check (min_increment > 0)
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.users(id) on delete cascade,
  amount numeric(18, 6) not null,
  created_at timestamptz not null default now(),
  is_winning boolean not null default false,
  check (amount > 0)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auctions(id) on delete cascade,
  winner_user_id uuid not null references public.users(id) on delete cascade,
  final_amount numeric(18, 6) not null,
  payment_tx_hash text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (final_amount > 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auctions_winner_bid_id_fkey'
  ) then
    alter table public.auctions
      add constraint auctions_winner_bid_id_fkey
      foreign key (winner_bid_id) references public.bids(id) on delete set null;
  end if;
end $$;

create index if not exists auctions_seller_status_idx
  on public.auctions (seller_id, status, end_at desc);

create index if not exists auctions_status_end_at_idx
  on public.auctions (status, end_at asc);

create index if not exists bids_auction_amount_idx
  on public.bids (auction_id, amount desc, created_at asc);

create index if not exists settlements_status_idx
  on public.settlements (status, created_at desc);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists auctions_set_updated_at on public.auctions;
create trigger auctions_set_updated_at
before update on public.auctions
for each row
execute function public.set_updated_at();

drop trigger if exists settlements_set_updated_at on public.settlements;
create trigger settlements_set_updated_at
before update on public.settlements
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.settlements enable row level security;

drop policy if exists "Users read self" on public.users;
create policy "Users read self"
  on public.users for select
  using (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "Users upsert self" on public.users;
create policy "Users upsert self"
  on public.users for all
  using (auth.uid() = id or auth.role() = 'service_role')
  with check (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "Public reads auctions" on public.auctions;
create policy "Public reads auctions"
  on public.auctions for select
  using (true);

drop policy if exists "Sellers manage own auctions" on public.auctions;
create policy "Sellers manage own auctions"
  on public.auctions for all
  using (seller_id = auth.uid() or auth.role() = 'service_role')
  with check (seller_id = auth.uid() or auth.role() = 'service_role');

drop policy if exists "Public reads bids" on public.bids;
create policy "Public reads bids"
  on public.bids for select
  using (true);

drop policy if exists "Bidders create own bids" on public.bids;
create policy "Bidders create own bids"
  on public.bids for insert
  with check (bidder_id = auth.uid() or auth.role() = 'service_role');

drop policy if exists "Service role updates bids" on public.bids;
create policy "Service role updates bids"
  on public.bids for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Public reads settlements" on public.settlements;
create policy "Public reads settlements"
  on public.settlements for select
  using (true);

drop policy if exists "Winner and seller manage settlement" on public.settlements;
create policy "Winner and seller manage settlement"
  on public.settlements for all
  using (
    winner_user_id = auth.uid()
    or exists (
      select 1
      from public.auctions
      where public.auctions.id = public.settlements.auction_id
        and public.auctions.seller_id = auth.uid()
    )
    or auth.role() = 'service_role'
  )
  with check (
    winner_user_id = auth.uid()
    or exists (
      select 1
      from public.auctions
      where public.auctions.id = public.settlements.auction_id
        and public.auctions.seller_id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
