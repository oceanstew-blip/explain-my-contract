create or replace function public.delete_unpaid_contract(
  p_contract_id uuid,
  p_recovery_token_hash text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment_status text;
  v_recovery_token_hash text;
  v_stripe_session_id text;
  v_stripe_payment_intent_id text;
begin
  if p_recovery_token_hash !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;

  select
    payment_status,
    recovery_token_hash,
    stripe_session_id,
    stripe_payment_intent_id
  into
    v_payment_status,
    v_recovery_token_hash,
    v_stripe_session_id,
    v_stripe_payment_intent_id
  from public.contracts
  where id = p_contract_id
  for update;

  if not found or v_recovery_token_hash is distinct from p_recovery_token_hash then
    return 'invalid';
  end if;

  if v_payment_status <> 'unpaid'
    or v_stripe_session_id is not null
    or v_stripe_payment_intent_id is not null
  then
    return 'protected';
  end if;

  delete from public.analyses where contract_id = p_contract_id;
  delete from public.contracts where id = p_contract_id;

  if not found then
    raise exception 'Contract disappeared during deletion';
  end if;

  return 'deleted';
end;
$$;

revoke all on function public.delete_unpaid_contract(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_unpaid_contract(uuid, text)
  to service_role;
