# API Route Rules

## Scope
- Applies to all `app/api/.../route.ts` handlers.
- Handlers are server-only; never expose secrets or service-role tokens to clients.

## Auth & Tenancy
- Enforce auth via `requireAuth`/Supabase user checks; reject unauthenticated requests with 401.
- Derive `activeTeamId` server-side when relevant; never trust client-provided `team_id`.
- Apply role checks for privileged actions using shared role constants; respond with 403 on violation.
- Validate membership against `team_members` before performing any tenant read/write; block cross-team access even if IDs are guessed.

## Input & Output
- Parse and validate all inputs (JSON/FormData) with Zod or equivalent; return 400 on invalid payloads.
- Use appropriate status codes: 400 invalid, 401/403 auth/role, 404 missing resource, 429 rate limits, 500 unexpected.
- Never leak secrets or stack traces; return concise error messages and log details server-side.
- Return structured JSON responses with clear `error` shapes; include correlation IDs for observability where applicable.
- Support pagination/limits on list endpoints; cap max page sizes to prevent abuse.

## External Services
- Stripe/OpenAI/Supabase service-role calls happen only here or in server actions, never in the client.
- Secrets come from env vars; fail fast with clear errors if keys are missing.
- Wrap external calls in try/catch with defensive logging; provide safe fallbacks where applicable.
- Stripe webhooks must verify signatures and run idempotently; avoid duplicate billing mutations.
- AI endpoints must parse JSON responses and degrade gracefully when OpenAI is unavailable.

## Multi-Tenancy & Realtime
- All DB access must include `team_id = activeTeamId`; respect RLS instead of bypassing it.
- Realtime-triggering writes should be scoped to tenant/team contexts to avoid cross-tenant leakage.
- Ensure route handlers unsubscribe/cleanup any streaming resources; avoid holding long-lived connections unnecessarily.

## Performance & Testing
- Avoid N+1 by batching/joins; paginate list endpoints.
- Add tests for validation, auth/role enforcement, and error paths; keep CI passing.
- Apply rate limits/throttling for spam-prone routes; respond with 429 and telemetry.
- Measure latency for critical endpoints; include telemetry without PII to monitor regressions.
