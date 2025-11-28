-- Enable RLS on telemetry_events to align with exposed PostgREST schemas
alter table if exists public.telemetry_events enable row level security;

-- No policies are added here because telemetry ingestion is handled via the service role,
-- which bypasses RLS. If direct client access is needed later, add explicit policies.
