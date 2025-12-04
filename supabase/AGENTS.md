# Supabase Ground Rules

## Tenant Model
- Single shared Postgres; tenant isolation is by `team_id` + strict RLS, never “one DB per tenant.”
- Every tenant-scoped table includes `team_id` (UUID), indexed and present in primary/unique composites where applicable.
- RLS policies must verify membership via `team_members` (or helper `is_team_member`) and `auth.uid()` for all CRUD.
- Never trust client-supplied `team_id`; derive from profile/`activeTeamId` and enforce on every query and channel filter.

## Schema & Migrations
- All schema changes live in `supabase/migrations`; never mutate schema elsewhere.
- Tables default to `uuid` PKs, explicit enums, bounded numerics, and `jsonb` with defaults when needed.
- New tenant tables start with RLS enabled; define `SELECT/INSERT/UPDATE/DELETE` policies up front.
- Ensure indexes on `team_id`, join/filter columns (game_id, play_id, user_id, timestamps, season_label, unit).

## RLS & Privileged Access
- RLS stays ON for tenant data. Only limited system/telemetry tables may run with RLS disabled; those writes must come from server-side service-role clients.
- Service-role usage is rare and isolated (telemetry, controlled imports, backfills); never exposed to client bundles.
- For background tasks, keep policy alignment with app paths; avoid bypassing RLS unless the table is explicitly non-tenant/system.

## Data Design
- Normalize for integrity (teams, users, games, sessions, chart_events, scout_* tables); add targeted denormalization/materialized views for heavy analytics (season summaries, drive stats).
- Consider partitioning/archiving for high-volume time-series (event logs, telemetry) to keep indexes lean and retention sane.
- Prefer explicit foreign keys and cascading rules that respect tenant scope; avoid orphaned rows by including `team_id` in FK relationships.

## Realtime & Performance
- Realtime channels must filter by `team_id` (and game/unit when relevant) to prevent cross-tenant leakage.
- Index columns used by realtime filters to keep replication performant.
- Avoid N+1: use server-side joins/views and pagination for dashboards and feeds.

## Testing & Safety
- Run migrations locally with Supabase CLI; ensure clean CI runs and rollback strategy for production.
- Validate RLS with representative users/roles; confirm policies block cross-team access.
- Log and handle Supabase errors; never ignore `error` responses from queries or RPCs.
