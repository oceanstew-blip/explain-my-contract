alter table public.contracts
  add column if not exists contract_type text,
  add column if not exists review_perspective text;

alter table public.contracts
  drop constraint if exists contracts_contract_type_check,
  drop constraint if exists contracts_review_perspective_check;

alter table public.contracts
  add constraint contracts_contract_type_check
    check (
      contract_type is null
      or contract_type in (
        'rental_lease',
        'brand_deal',
        'insurance_policy',
        'other'
      )
    ),
  add constraint contracts_review_perspective_check
    check (
      review_perspective is null
      or char_length(review_perspective) between 1 and 120
    );

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
  p_recovery_token_hash text,
  p_contract_type text,
  p_review_perspective text
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
  if p_contract_type not in (
    'rental_lease',
    'brand_deal',
    'insurance_policy',
    'other'
  ) then
    raise exception 'Invalid contract type';
  end if;
  if char_length(trim(p_review_perspective)) not between 1 and 120 then
    raise exception 'Invalid review perspective';
  end if;

  insert into public.contracts (
    user_id,
    file_name,
    page_count,
    status,
    stripe_session_id,
    recovery_token_hash,
    report_expires_at,
    contract_type,
    review_perspective
  ) values (
    null,
    p_file_name,
    p_page_count,
    'scanned_unpaid',
    null,
    p_recovery_token_hash,
    v_report_expires_at,
    p_contract_type,
    trim(p_review_perspective)
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
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.create_contract_analysis(
  text,
  integer,
  text,
  jsonb,
  jsonb,
  text,
  text,
  text
) to service_role;
