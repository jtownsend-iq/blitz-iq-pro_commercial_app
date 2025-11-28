-- Create telemetry_events table for app analytics/telemetry ingestion
create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  source text not null default 'app',
  payload jsonb not null default '{}'::jsonb,
  ts bigint not null,
  user_agent text default null,
  ip text default null,
  created_at timestamptz not null default now()
);

-- Basic indexes for query performance
create index if not exists telemetry_events_ts_idx on public.telemetry_events using brin (ts);
create index if not exists telemetry_events_event_idx on public.telemetry_events (event);
create index if not exists telemetry_events_source_idx on public.telemetry_events (source);
create index if not exists telemetry_events_created_at_idx on public.telemetry_events using brin (created_at);

-- Optional partial index for recent time window queries
-- Note: avoid partial index with now() to keep predicate immutable; query recent data with WHERE ts > ...
