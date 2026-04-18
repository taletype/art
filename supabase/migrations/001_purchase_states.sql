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

create index if not exists purchase_states_status_updated_at_idx
  on public.purchase_states (status, updated_at desc);

alter table public.purchase_states enable row level security;

drop policy if exists "Service role manages purchase states" on public.purchase_states;

create policy "Service role manages purchase states"
  on public.purchase_states
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
