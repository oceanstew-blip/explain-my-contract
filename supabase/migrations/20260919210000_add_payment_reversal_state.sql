alter table public.contracts
  add column if not exists payment_failed_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists disputed_at timestamptz;

alter table public.contracts
  drop constraint if exists contracts_payment_status_check;

alter table public.contracts
  add constraint contracts_payment_status_check
  check (
    payment_status in (
      'unpaid',
      'checkout_open',
      'paid',
      'failed',
      'refunded',
      'disputed'
    )
  );

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
  if p_target_status not in ('failed', 'refunded', 'disputed', 'paid') then
    raise exception 'Unsupported payment status transition';
  end if;

  if p_payment_intent_id is null and p_session_id is null then
    raise exception 'Payment event is missing a contract reference';
  end if;

  if p_payment_intent_id is not null then
    select id, payment_status
    into v_contract_id, v_current_status
    from public.contracts
    where stripe_payment_intent_id = p_payment_intent_id
    for update;
  else
    select id, payment_status
    into v_contract_id, v_current_status
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
  ) values (
    p_event_id,
    p_event_type,
    v_contract_id
  )
  on conflict (stripe_event_id) do nothing;

  if not found then
    return;
  end if;

  v_next_status := case
    when p_target_status = 'failed' and v_current_status = 'checkout_open'
      then 'failed'
    when p_target_status = 'refunded' and v_current_status in ('paid', 'disputed')
      then 'refunded'
    when p_target_status = 'disputed' and v_current_status = 'paid'
      then 'disputed'
    when p_target_status = 'paid' and v_current_status = 'disputed'
      then 'paid'
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
    end
  where id = v_contract_id;
end;
$$;

revoke all on function public.record_payment_state_event(
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.record_payment_state_event(
  text,
  text,
  text,
  text,
  text
) to service_role;
