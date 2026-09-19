alter table public.contracts
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists stripe_checkout_version integer not null default 0,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz;

alter table public.contracts
  drop constraint if exists contracts_payment_status_check;

alter table public.contracts
  add constraint contracts_payment_status_check
  check (payment_status in ('unpaid', 'checkout_open', 'paid', 'failed', 'refunded'));

create unique index if not exists contracts_stripe_session_id_unique
  on public.contracts (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists contracts_stripe_payment_intent_id_unique
  on public.contracts (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant select, insert on table public.stripe_webhook_events to service_role;

create or replace function public.create_contract_analysis(
  p_file_name text,
  p_page_count integer,
  p_intent text,
  p_tease_summary jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_contract_id uuid;
begin
  insert into public.contracts (
    user_id,
    file_name,
    page_count,
    status,
    stripe_session_id
  ) values (
    null,
    p_file_name,
    p_page_count,
    'scanned_unpaid',
    null
  )
  returning id into new_contract_id;

  insert into public.analyses (
    contract_id,
    intent,
    tease_summary,
    full_report
  ) values (
    new_contract_id,
    p_intent,
    p_tease_summary,
    null
  );

  return new_contract_id;
end;
$$;

revoke all on function public.create_contract_analysis(text, integer, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_contract_analysis(text, integer, text, jsonb)
  to service_role;

create or replace function public.record_paid_checkout(
  p_contract_id uuid,
  p_event_id text,
  p_event_type text,
  p_payment_intent_id text,
  p_session_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    contract_id
  ) values (
    p_event_id,
    p_event_type,
    p_contract_id
  )
  on conflict (stripe_event_id) do nothing;

  if not found then
    return;
  end if;

  update public.contracts
  set
    payment_status = 'paid',
    stripe_payment_intent_id = p_payment_intent_id,
    paid_at = coalesce(paid_at, now())
  where id = p_contract_id
    and stripe_session_id = p_session_id;

  if not found then
    raise exception 'No matching contract and Stripe session';
  end if;
end;
$$;

revoke all on function public.record_paid_checkout(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_paid_checkout(uuid, text, text, text, text)
  to service_role;
