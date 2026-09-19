begin;
select plan(18);

create temporary table retention_test_ids (
  label text primary key,
  contract_id uuid not null,
  report_expires_at timestamptz
) on commit drop;

select ok(
  not has_function_privilege(
    'anon',
    'public.expire_due_records(integer)',
    'execute'
  ),
  'anon cannot execute retention cleanup'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.expire_due_records(integer)',
    'execute'
  ),
  'authenticated cannot execute retention cleanup'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.expire_due_records(integer)',
    'execute'
  ),
  'service_role can execute retention cleanup'
);
select ok(
  exists (
    select 1
    from cron.job
    where jobname = 'expire-explain-my-contract-records'
      and schedule = '17 3 * * *'
  ),
  'daily bounded retention job is registered'
);

insert into retention_test_ids (label, contract_id, report_expires_at)
select 'created', contract_id, report_expires_at
from public.create_contract_analysis(
  'new-contract.pdf',
  2,
  'considering_signing',
  '{}'::jsonb,
  '{}'::jsonb,
  repeat('a', 64)
);

select ok(
  (select contract_id is not null from retention_test_ids where label = 'created'),
  'analysis creation returns the contract id'
);
select ok(
  (
    select report_expires_at between
      now() + interval '23 hours 59 minutes'
      and now() + interval '24 hours 1 minute'
    from retention_test_ids
    where label = 'created'
  ),
  'new unpaid report expires in 24 hours'
);

update public.contracts
set
  payment_status = 'checkout_open',
  stripe_session_id = 'cs_pgtap_paid',
  financial_records_expires_at = now() + interval '7 years'
where id = (
  select contract_id from retention_test_ids where label = 'created'
);

do $$
begin
  perform public.record_paid_checkout(
    (select contract_id from retention_test_ids where label = 'created'),
    'evt_pgtap_paid',
    'checkout.session.completed',
    'pi_pgtap_paid',
    'cs_pgtap_paid'
  );
end;
$$;

select is(
  (
    select payment_status
    from public.contracts
    where id = (select contract_id from retention_test_ids where label = 'created')
  ),
  'paid'::text,
  'confirmed Checkout records paid state'
);
select ok(
  (
    select report_expires_at between
      now() + interval '29 days 23 hours 59 minutes'
      and now() + interval '30 days 1 minute'
    from public.contracts
    where id = (select contract_id from retention_test_ids where label = 'created')
  ),
  'confirmed payment extends report retention to 30 days'
);
select ok(
  (
    select financial_records_expires_at >= now() + interval '6 years 364 days'
    from public.contracts
    where id = (select contract_id from retention_test_ids where label = 'created')
  ),
  'confirmed payment retains financial metadata for seven years'
);

insert into retention_test_ids (label, contract_id)
values
  ('unpaid', '10000000-0000-4000-8000-000000000001'),
  ('paid', '10000000-0000-4000-8000-000000000002'),
  ('financial', '10000000-0000-4000-8000-000000000003');

insert into public.contracts (
  id, file_name, page_count, status, payment_status,
  stripe_session_id, stripe_payment_intent_id, recovery_token_hash,
  report_expires_at, report_expired_at, financial_records_expires_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'unpaid.pdf', 1, 'scanned_unpaid', 'unpaid',
    null, null, repeat('b', 64),
    now() - interval '1 minute', null, null
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'paid.pdf', 1, 'scanned_unpaid', 'paid',
    'cs_pgtap_expired', 'pi_pgtap_expired', repeat('c', 64),
    now() - interval '1 minute', null, now() + interval '7 years'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '[expired report]', 1, 'scanned_unpaid', 'refunded',
    'cs_pgtap_financial', null, null,
    now() - interval '2 days', now() - interval '1 day',
    now() - interval '1 minute'
  );

insert into public.analyses (contract_id, intent, tease_summary, full_report)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'considering_signing', '{}'::jsonb, '{}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'already_signed', '{}'::jsonb, '{}'::jsonb
  );

insert into public.stripe_webhook_events (
  stripe_event_id, event_type, contract_id, retention_expires_at
) values (
  'evt_pgtap_expired',
  'test.expired',
  '10000000-0000-4000-8000-000000000002',
  now() - interval '1 minute'
);

create temporary table retention_test_counts on commit drop as
select * from public.expire_due_records(500);

select is(
  (select reports_expired from retention_test_counts),
  2,
  'cleanup expires each due report'
);
select is(
  (select unpaid_records_deleted from retention_test_counts),
  1,
  'cleanup deletes payment-free unpaid records'
);
select is(
  (select webhook_events_deleted from retention_test_counts),
  1,
  'cleanup deletes expired webhook idempotency records'
);
select is(
  (select financial_records_deleted from retention_test_counts),
  1,
  'cleanup deletes expired financial records'
);
select ok(
  not exists (
    select 1 from public.contracts
    where id = '10000000-0000-4000-8000-000000000001'
  ),
  'expired payment-free contract is gone'
);
select ok(
  not exists (
    select 1 from public.contracts
    where id = '10000000-0000-4000-8000-000000000003'
  ),
  'expired financial contract is gone'
);
select ok(
  not exists (
    select 1 from public.analyses
    where contract_id = '10000000-0000-4000-8000-000000000002'
  ),
  'expired paid analysis content is gone'
);
select ok(
  exists (
    select 1 from public.contracts
    where id = '10000000-0000-4000-8000-000000000002'
      and file_name = '[expired report]'
      and recovery_token_hash is null
      and report_expired_at is not null
  ),
  'expired paid record is retained with report identifiers removed'
);
select ok(
  not exists (
    select 1 from public.stripe_webhook_events
    where stripe_event_id = 'evt_pgtap_expired'
  ),
  'expired webhook event is gone'
);

select * from finish();
rollback;
