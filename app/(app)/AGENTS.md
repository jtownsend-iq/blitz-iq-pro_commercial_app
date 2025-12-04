# Authenticated Shell & Team Context

## Assumptions
- User is authenticated and has an `activeTeamId`; everything here is tenant-scoped.
- Profile fetch + membership check is mandatory before rendering pages under `(app)`.
- Handle invite-accept flows gracefully; if invite pending, surface a clear call to join before data access.

## Tenant Enforcement
- If no `activeTeamId`, redirect to onboarding/team creation/selection.
- If the user lacks membership for the `activeTeamId`, block or redirect with a clear state.
- All Supabase reads/writes must include `team_id = activeTeamId`; validate loaded entities (games, sessions, staff, reports) against that ID.
- Realtime channels must include `team_id` filters and be disposed on unmount or team switch.

## Roles & Access
- Use shared role constants (Owner/Admin/Head Coach/Coordinator/Analyst/IT Admin) to gate privileged actions.
- Enforce roles server-side for mutations (server actions/route handlers) in addition to UI gating.
- Keep audit-friendly logs/telemetry for sensitive actions (role changes, settings updates, imports).
- Default to least privilege; hide actions the user cannot perform and return 403 on server when attempted.
- Stripe/billing actions must be server-side and role-protected (owners/admins).

## UX & Performance
- Covers dashboards, games, scouting, settings, and related views; maintain low latency with pagination and efficient queries.
- Favor Server Components for data fetching; Client Components only for interactivity or realtime.
- Realtime subscriptions must filter by `team_id` (plus game/unit where relevant) and clean up on unmount.
- Provide resilient states: optimistic updates where safe, retry/backoff on failures, graceful offline handling.
- Stream or chunk large datasets (season summaries, scouting grids) rather than shipping everything at once.
- Keep mobile and tablet layouts first-class; avoid fixed widths and ensure touch targets meet accessibility sizes.
- Respect reduced-motion preferences while maintaining purposeful micro-interactions.

## Quality Bar
- Strict TypeScript, lint/format clean; no `any` or unchecked `@ts-ignore`.
- Tests for critical tenant flows (role gating, dashboard summaries, realtime updates) and CI green before merge.
- Log and handle Supabase/OpenAI/Stripe errors defensively; provide user-friendly messages without revealing internals.
- Telemetry should capture key tenant actions and failures (without PII) for observability and future SLOs.
