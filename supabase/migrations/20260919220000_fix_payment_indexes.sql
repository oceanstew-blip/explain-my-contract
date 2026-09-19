drop index if exists public.contracts_stripe_session_id_unique_idx;

create index if not exists stripe_webhook_events_contract_id_idx
  on public.stripe_webhook_events (contract_id);
