# BlitzIQ Pro Production Guardrails

## Isolation & Tenancy
- Every tenant row carries `team_id` (UUID) with indexes; policies rely on membership via `team_members`.
- Server-side tenancy only: use `requireTenantContext` for protected routes/actions; never trust client-supplied team IDs.
- Scope queries and Realtime channels by `team_id`; log and block scope mismatches via `assertTeamScope`.
- RLS must stay enabled on tenant tables; add policy tests for allow/deny paths per table.

## Performance & Noisy Neighbor
- Per-team rate limits/quotas on APIs; cap Realtime fan-out per team/game; drop idle subscriptions.
- Queue heavy work (CSV ingest, AI summaries) with per-team concurrency; avoid long-running request handlers.
- Partition or archive hot logs/telemetry; keep indexes lean and time-bounded.
- Use PgBouncer; add read replicas for dashboards; enforce per-role connection caps and sane statement timeouts.

## Safety & Resilience
- Backups + PITR enabled; quarterly restore tests with runbooks; document RTO/RPO targets.
- TLS everywhere; at-rest encryption for DB/object storage; secrets stay server-side with rotation cadence.
- Migrations: preflight on staging, include downgrade/rollback steps, block deploy on migration/test failures.
- DR: define failover regions, rehearse cutovers, and monitor replication lag before promoting.

## Observability
- Tag logs/metrics/traces with `team_id`, user, and tier; propagate correlation IDs through API and workers.
- SLOs per tier (latency/error for key endpoints, Realtime freshness) with burn-rate alerts.
- Alert on any cross-tenant access attempt or RLS bypass; dashboard noisy-neighbor hotspots by team.

## Compliance & Data
- Data classification and retention windows per table/column; auto-delete or archive with audit logs.
- PII minimization and log redaction; avoid storing secrets/keys in payloads.
- Shard-readiness: keep `team_id` everywhere; avoid cross-tenant joins; wrap tenancy in helpers so regional split is operational, not a rewrite.
