# Tenant Isolation Checklist

## Pillars
- **RLS on tenant tables**: `team_id` on every tenant row; RLS enabled; policies enforce membership (`team_members`) + `auth.uid()`.
- **Server-side tenancy**: derive `activeTeamId` on the server; never trust client-provided IDs. Use `requireTenantContext` + `assertTeamScope`.
- **Least privilege**: service-role keys are server-only; app roles constrained by RLS; per-role connection limits.
- **Rate limits/quotas**: per-team guards on writes/ingest; cap Realtime fan-out; alert on limit hits.
- **Observability**: tag telemetry/logs with `team_id`/tier; alert on cross-tenant access attempts.
- **Data hygiene**: index `team_id` + filters; partition/retain hot tables; backups + PITR.

## How to verify
- **RLS checks**: `npm run test:integration -- rls-tenancy.integration.test.mjs` (self-provisions temp user/teams; requires Supabase URL/anon key/service role).
- **Settings isolation**: `npm run test:integration -- settings-actions.integration.test.mjs`.
- **Runtime guards**: ensure server actions/routes use `requireTenantContext` and `guardTenantAction`.

## When adding data paths
1) Add `team_id` + indexes on new tables.
2) Enable RLS; add policies for select/insert/update/delete.
3) Gate server code with `requireTenantContext`; assert scopes on fetched rows.
4) Add allow/deny RLS tests (self-provisioned).
5) Tag telemetry with `team_id`/tier; add rate limits for heavy endpoints.
