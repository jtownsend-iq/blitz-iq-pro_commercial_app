# Migration Conventions

## General Rules
- Migrations are additive and backward-compatible; prefer `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and staged removals with deprecation windows.
- Provide defaults/backfills for new non-nullable columns before tightening constraints.
- Keep typing explicit: UUID primary keys, enums for constrained strings, bounded numerics, `jsonb` with sane defaults.
- Mirror existing style (e.g., `20251121_fix_team_rls_initplan.sql`): clear comments, ordered statements, and explicit `SET check_function_bodies = OFF` only when necessary.
- Version tables/functions carefully; keep compatibility shims when clients still expect older shapes.
- No ad-hoc hotfixes in prod; everything ships as a migration checked into VCS.

## RLS & Security
- Enable RLS immediately on any tenant-related table; no table ships without policies.
- Define explicit `SELECT/INSERT/UPDATE/DELETE` policies matching membership checks used elsewhere (team_members/is_team_member + `auth.uid()`).
- Service-role bypass is only for designated system tables; never weaken tenant tables for convenience.

## Indexing & Performance
- Index every tenant discriminator: `team_id` plus frequent join/filter columns (`game_id`, `session_id`, `play_id`, `user_id`, timestamps, season_label, unit, opponent_id).
- Add composite indexes where queries filter on multiple columns; keep index names consistent and descriptive.
- For high-volume logs, plan for partitioning or archival strategies to keep indexes small.
- Revisit indexes when query plans change (new filters, new joins); drop or adjust to avoid bloat.

## Safety & Testing
- Run migrations locally with Supabase CLI and ensure CI can apply them cleanly.
- Order operations to avoid locks: create new columns -> backfill -> set defaults -> add constraints -> update policies.
- Include `IF EXISTS/IF NOT EXISTS` guards where it avoids failures on replays without masking real issues.
- Validate RLS behavior post-migration with representative users/roles before shipping.
- Document any data backfills, expected runtimes, and operational steps (pauses, lock expectations).
- Prefer idempotent scripts for backfills; chunk large updates to avoid long locks.

## Realtime & Analytics Considerations
- Ensure indexes support realtime filters (team_id + context columns) to keep replication efficient.
- For analytics or summary tables, consider materialized views or aggregated tables; keep them in sync via triggers/jobs as needed.
- Review how new columns propagate to realtime payloads and clients; guard against payload bloat.
