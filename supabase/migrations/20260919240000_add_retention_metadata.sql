-- Retention defaults are product-policy defaults, not legal conclusions.
-- Revisit them with the written privacy/refund policy before launch.
alter table public.contracts
  add column if not exists report_expires_at timestamptz,
  add column if not exists report_expired_at timestamptz,
  add column if not exists financial_records_expires_at timestamptz;

update public.contracts
set report_expires_at = case
  when payment_status = 'paid'
    then now() + interval '30 days'
  else now() + interval '24 hours'
end
where report_expires_at is null;

update public.contracts
set financial_records_expires_at = now() + interval '7 years'
where financial_records_expires_at is null
  and (
    stripe_session_id is not null
    or stripe_payment_intent_id is not null
    or payment_status in ('paid', 'failed', 'refunded', 'disputed')
  );

alter table public.contracts
  alter column report_expires_at set default (now() + interval '24 hours'),
  alter column report_expires_at set not null;

alter table public.contracts
  drop constraint if exists contracts_report_expiration_check;

alter table public.contracts
  add constraint contracts_report_expiration_check
  check (
    report_expired_at is null
    or report_expired_at >= report_expires_at
  );

alter table public.stripe_webhook_events
  add column if not exists retention_expires_at timestamptz;

update public.stripe_webhook_events
set retention_expires_at = processed_at + interval '400 days'
where retention_expires_at is null;

alter table public.stripe_webhook_events
  alter column retention_expires_at
    set default (now() + interval '400 days'),
  alter column retention_expires_at set not null;

create index if not exists contracts_report_expires_at_idx
  on public.contracts (report_expires_at)
  where report_expired_at is null;

create index if not exists contracts_financial_records_expires_at_idx
  on public.contracts (financial_records_expires_at)
  where financial_records_expires_at is not null;

create index if not exists stripe_webhook_events_retention_expires_at_idx
  on public.stripe_webhook_events (retention_expires_at);

revoke all on function public.create_contract_analysis(
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated, service_role;

drop function public.create_contract_analysis(
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
);

create function public.create_contract_analysis(
  p_file_name text,
  p_page_count integer,
  p_intent text,
  p_tease_summary jsonb,
  p_full_report jsonb,
  p_recovery_token_hash text
)
returns table (contract_id uuid, report_expires_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contract_id uuid;
  v_report_expires_at timestamptz := now() + interval '24 hours';
begin
  if p_recovery_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid recovery token hash';
  end if;

  insert into public.contracts (
    user_id,
    file_name,
    page_count,
    status,
    stripe_session_id,
    recovery_token_hash,
    report_expires_at
  ) values (
    null,
    p_file_name,
    p_page_count,
    'scanned_unpaid',
    null,
    p_recovery_token_hash,
    v_report_expires_at
  )
  returning id into v_contract_id;

  insert into public.analyses (
    contract_id,
    intent,
    tease_summary,
    full_report
  ) values (
    v_contract_id,
    p_intent,
    p_tease_summary,
    p_full_report
  );

  return query select v_contract_id, v_report_expires_at;
end;
$$;

revoke all on function public.create_contract_analysis(
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated;
grant execute on function public.create_contract_analysis(
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text
) to service_role;

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
    paid_at = coalesce(paid_at, now()),
    report_expires_at = greatest(report_expires_at, now() + interval '30 days'),
    financial_records_expires_at = greatest(
      coalesce(financial_records_expires_at, '-infinity'::timestamptz),
      now() + interval '7 years'
    )
  where id = p_contract_id
    and stripe_session_id = p_session_id
    and report_expired_at is null;

  if not found then
    raise exception 'No active report matches the contract and Stripe session';
  end if;
end;
$$;

revoke all on function public.record_paid_checkout(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_paid_checkout(uuid, text, text, text, text)
  to service_role;

create or replace function public.record_payment_state_event(
  p_event_id text,
  p_event_type text,
  p_target_status text,
  p_payment_intent_id text default null,
  p_session_id text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_contract_id uuid;
  v_current_status text;
  v_next_status text;
begin
  if p_target_status not in ('failed', 'refunded', 'disputed', 'paid', 'unchanged') then
    raise exception 'Unsupported payment status transition';
  end if;
  if p_payment_intent_id is null and p_session_id is null then
    raise exception 'Payment event is missing a contract reference';
  end if;

  if p_payment_intent_id is not null then
    select id, payment_status into v_contract_id, v_current_status
    from public.contracts
    where stripe_payment_intent_id = p_payment_intent_id
    for update;
  else
    select id, payment_status into v_contract_id, v_current_status
    from public.contracts
    where stripe_session_id = p_session_id
    for update;
  end if;

  if v_contract_id is null then
    raise exception 'No contract matches the Stripe payment event';
  end if;

  insert into public.stripe_webhook_events (
    stripe_event_id,
    event_type,
    contract_id
  ) values (p_event_id, p_event_type, v_contract_id)
  on conflict (stripe_event_id) do nothing;

  if not found then
    return;
  end if;

  v_next_status := case
    when p_target_status = 'failed' and v_current_status = 'checkout_open' then 'failed'
    when p_target_status = 'refunded' and v_current_status in ('paid', 'disputed') then 'refunded'
    when p_target_status = 'disputed' and v_current_status = 'paid' then 'disputed'
    when p_target_status = 'paid' and v_current_status = 'disputed' then 'paid'
    else v_current_status
  end;

  update public.contracts
  set
    payment_status = v_next_status,
    payment_failed_at = case
      when v_next_status = 'failed' and v_current_status <> 'failed'
        then coalesce(payment_failed_at, now())
      else payment_failed_at
    end,
    refunded_at = case
      when v_next_status = 'refunded' and v_current_status <> 'refunded'
        then coalesce(refunded_at, now())
      else refunded_at
    end,
    disputed_at = case
      when v_next_status = 'disputed' and v_current_status <> 'disputed'
        then coalesce(disputed_at, now())
      else disputed_at
    end,
    financial_records_expires_at = greatest(
      coalesce(financial_records_expires_at, '-infinity'::timestamptz),
      now() + interval '7 years'
    )
  where id = v_contract_id;
end;
$$;

revoke all on function public.record_payment_state_event(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_payment_state_event(text, text, text, text, text)
  to service_role;

create or replace function public.expire_due_records(
  p_batch_size integer default 500
)
returns table (
  reports_expired integer,
  unpaid_records_deleted integer,
  webhook_events_deleted integer,
  financial_records_deleted integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reports_expired integer := 0;
  v_unpaid_records_deleted integer := 0;
  v_webhook_events_deleted integer := 0;
  v_financial_records_deleted integer := 0;
begin
  if p_batch_size < 1 or p_batch_size > 5000 then
    raise exception 'Retention batch size must be between 1 and 5000';
  end if;

  with due as (
    select id
    from public.contracts
    where report_expired_at is null
      and report_expires_at <= now()
    order by report_expires_at
    limit p_batch_size
    for update skip locked
  ), removed_analyses as (
    delete from public.analyses a
    using due
    where a.contract_id = due.id
    returning a.contract_id
  ), expired_contracts as (
    update public.contracts c
    set
      file_name = '[expired report]',
      recovery_token_hash = null,
      report_expired_at = now()
    from due
    where c.id = due.id
    returning c.id
  )
  select count(*)::integer into v_reports_expired from expired_contracts;

  with due as (
    select id
    from public.contracts
    where report_expired_at is not null
      and financial_records_expires_at is null
      and stripe_session_id is null
      and stripe_payment_intent_id is null
      and payment_status = 'unpaid'
    order by report_expired_at
    limit p_batch_size
    for update skip locked
  ), deleted as (
    delete from public.contracts c
    using due
    where c.id = due.id
    returning c.id
  )
  select count(*)::integer into v_unpaid_records_deleted from deleted;

  with due as (
    select stripe_event_id
    from public.stripe_webhook_events
    where retention_expires_at <= now()
    order by retention_expires_at
    limit p_batch_size
    for update skip locked
  ), deleted as (
    delete from public.stripe_webhook_events e
    using due
    where e.stripe_event_id = due.stripe_event_id
    returning e.stripe_event_id
  )
  select count(*)::integer into v_webhook_events_deleted from deleted;

  with due as (
    select id
    from public.contracts
    where report_expired_at is not null
      and financial_records_expires_at is not null
      and financial_records_expires_at <= now()
    order by financial_records_expires_at
    limit p_batch_size
    for update skip locked
  ), deleted as (
    delete from public.contracts c
    using due
    where c.id = due.id
    returning c.id
  )
  select count(*)::integer into v_financial_records_deleted from deleted;

  return query select
    v_reports_expired,
    v_unpaid_records_deleted,
    v_webhook_events_deleted,
    v_financial_records_deleted;
end;
$$;

revoke all on function public.expire_due_records(integer)
  from public, anon, authenticated;
grant execute on function public.expire_due_records(integer)
  to service_role;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-explain-my-contract-records',
  '17 3 * * *',
  $$select * from public.expire_due_records(500);$$
);
