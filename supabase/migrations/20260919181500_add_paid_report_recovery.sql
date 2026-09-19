alter table public.contracts
  add column if not exists recovery_token_hash text;

alter table public.contracts
  drop constraint if exists contracts_recovery_token_hash_check;

alter table public.contracts
  add constraint contracts_recovery_token_hash_check
  check (
    recovery_token_hash is null
    or recovery_token_hash ~ '^[0-9a-f]{64}$'
  );

create unique index if not exists contracts_recovery_token_hash_unique
  on public.contracts (recovery_token_hash)
  where recovery_token_hash is not null;

revoke all on function public.create_contract_analysis(text, integer, text, jsonb)
  from public, anon, authenticated, service_role;

create function public.create_contract_analysis(
  p_file_name text,
  p_page_count integer,
  p_intent text,
  p_tease_summary jsonb,
  p_full_report jsonb,
  p_recovery_token_hash text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_contract_id uuid;
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
    recovery_token_hash
  ) values (
    null,
    p_file_name,
    p_page_count,
    'scanned_unpaid',
    null,
    p_recovery_token_hash
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
    p_full_report
  );

  return new_contract_id;
end;
$$;

revoke all on function public.create_contract_analysis(text, integer, text, jsonb, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.create_contract_analysis(text, integer, text, jsonb, jsonb, text)
  to service_role;
