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

## Domains & Routing
- DNS via IaC (Terraform) with DNSSEC; forbid wildcards and dangling third-party CNAMEs; weekly scans for takeovers.
- Custom domains gated by TXT validation, edge host mapping, and ACME automation (renew at 30d); reject unknown hosts at the edge.
- HSTS, TLS 1.2+, OCSP stapling, and same-host redirect defaults; rate limits/WAF applied per host/tenant before origin.
- See `docs/domains-and-routing.md` for the full runbook.

## UI/UX Excellence
- System-first tokens (spacing/typography/color/motion) with component parity between design and code; no ad hoc styles.
- Required states: loading skeletons, empty, inline errors, success confirmations; destructive actions confirm.
- Accessibility: keyboard-first, WCAG AA contrast, focus rings, aria-live for async, modals trap focus.
- Responsiveness: mobile/desktop checked per PR; primary actions stay visible; no layout shift (set dimensions).
- Tests/gates: axe lint, Lighthouse budgets for LCP/CLS/INP, visual diffs on key templates; PR checklist enforces tokens + states.
- See `docs/ui-ux-standards.md` for the plan and definitions of ready/done.

## Observability
- Tag logs/metrics/traces with `team_id`, user, and tier; propagate correlation IDs through API and workers.
- SLOs per tier (latency/error for key endpoints, Realtime freshness) with burn-rate alerts.
- Alert on any cross-tenant access attempt or RLS bypass; dashboard noisy-neighbor hotspots by team.

## Compliance & Data
- Data classification and retention windows per table/column; auto-delete or archive with audit logs.
- PII minimization and log redaction; avoid storing secrets/keys in payloads.
- Shard-readiness: keep `team_id` everywhere; avoid cross-tenant joins; wrap tenancy in helpers so regional split is operational, not a rewrite.
