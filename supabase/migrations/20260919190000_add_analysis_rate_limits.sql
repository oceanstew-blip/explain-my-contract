create table if not exists public.analysis_rate_limits (
  identifier_hash text primary key
    constraint analysis_rate_limits_identifier_hash_check
    check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1),
  updated_at timestamptz not null
);

alter table public.analysis_rate_limits enable row level security;
revoke all on table public.analysis_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.analysis_rate_limits
  to service_role;

create or replace function public.consume_analysis_rate_limit(
  p_identifier_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_identifier_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid identifier hash';
  end if;
  if p_max_requests < 1 or p_max_requests > 1000 then
    raise exception 'Invalid request limit';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit window';
  end if;

  insert into public.analysis_rate_limits (
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    p_identifier_hash,
    v_now,
    1,
    v_now
  )
  on conflict (identifier_hash) do update
  set
    window_started_at = case
      when public.analysis_rate_limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      then v_now
      else public.analysis_rate_limits.window_started_at
    end,
    request_count = case
      when public.analysis_rate_limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
      then 1
      else public.analysis_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning
    public.analysis_rate_limits.window_started_at,
    public.analysis_rate_limits.request_count
  into v_window_started_at, v_request_count;

  return query select
    v_request_count <= p_max_requests,
    greatest(p_max_requests - v_request_count, 0),
    case
      when v_request_count <= p_max_requests then 0
      else ceil(greatest(
        0,
        extract(epoch from (
          v_window_started_at
          + make_interval(secs => p_window_seconds)
          - v_now
        ))
      ))::integer
    end;
end;
$$;

revoke all on function public.consume_analysis_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_analysis_rate_limit(text, integer, integer)
  to service_role;
