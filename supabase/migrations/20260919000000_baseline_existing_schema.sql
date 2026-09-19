-- Baseline for objects created in the hosted project before CLI migration
-- tracking began. Later migrations remain responsible for payment, recovery,
-- rate-limit, reversal, and retention changes.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

comment on table public.users is
  'Application profile associated one-to-one with auth.users.';

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  file_name text not null
    constraint contracts_file_name_check
    check (char_length(file_name) between 1 and 255),
  page_count integer not null
    constraint contracts_page_count_check
    check (page_count > 0),
  status text not null default 'scanned_unpaid'
    constraint contracts_status_check
    check (status in ('scanned_unpaid', 'paid_unlocked')),
  stripe_session_id text,
  created_at timestamptz not null default now(),
  constraint paid_contract_requires_stripe_session
    check (status <> 'paid_unlocked' or stripe_session_id is not null)
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null
    constraint analyses_contract_id_fkey
    references public.contracts(id) on delete cascade,
  tease_summary jsonb not null
    constraint tease_summary_is_object
    check (jsonb_typeof(tease_summary) = 'object'),
  full_report jsonb
    constraint full_report_is_object_or_null
    check (full_report is null or jsonb_typeof(full_report) = 'object'),
  intent text not null
    constraint analyses_intent_check
    check (intent in ('considering_signing', 'already_signed')),
  constraint one_analysis_per_contract unique (contract_id)
);

create index analyses_contract_id_idx
  on public.analyses (contract_id);
create index contracts_created_at_idx
  on public.contracts (created_at desc);
create index contracts_user_id_idx
  on public.contracts (user_id);

alter table public.users enable row level security;
alter table public.contracts enable row level security;
alter table public.analyses enable row level security;

create policy "Users can read their own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their own contracts"
  on public.contracts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read analyses for their own contracts"
  on public.analyses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.contracts
      where contracts.id = analyses.contract_id
        and contracts.user_id = (select auth.uid())
    )
  );

revoke all on table public.users, public.contracts, public.analyses
  from anon, authenticated;

grant select on table public.users, public.contracts, public.analyses
  to authenticated;
grant update (display_name) on table public.users
  to authenticated;
grant all on table public.users, public.contracts, public.analyses
  to service_role;
