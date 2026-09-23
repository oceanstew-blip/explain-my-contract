alter table public.contracts
  add column if not exists report_email_sent_at timestamptz,
  add column if not exists report_email_provider_id text;

alter table public.contracts
  drop constraint if exists contracts_report_email_delivery_check;

alter table public.contracts
  add constraint contracts_report_email_delivery_check
  check (
    (report_email_sent_at is null and report_email_provider_id is null)
    or (report_email_sent_at is not null and report_email_provider_id is not null)
  );
