# App Router Rules

## Architecture
- Next.js App Router with nested layouts; Server Components by default, Client Components only for interactivity/realtime.
- Auth and tenant context resolved server-side (middleware/helpers) before rendering; redirect unauthenticated users early.
- Sensitive logic (DB/AI/CSV/Stripe) belongs in Server Components, server actions, or `app/api/.../route.ts` handlers—never client bundles.
- Keep layouts thin but data-aware; fetch tenant-scope data in layouts when shared across child routes (nav, team switcher, role).
- Use edge/SSR strategically; avoid static generation for tenant-personalized content unless revalidated per team.

## Routing & Middleware
- Use layouts for shared shells; load data at the layout level when it’s tenant-wide.
- Enforce `requireAuth` and tenant detection (host/path/profile) in middleware/helpers; derive `activeTeamId` server-side and pass down.
- Route handlers cover Stripe webhooks, subscription flows, AI endpoints, telemetry, CSV uploads, and realtime backends; keep them thin but validated.
- Guard route groups by intent ((auth) vs (app)) to avoid leaking data to unauthenticated users.
- Provide meaningful redirects for onboarding gaps (no team, pending invite).

## Data & Multi-Tenancy
- All Supabase queries must scope to `team_id = activeTeamId`; never trust client-provided team IDs.
- Realtime subscriptions filter by `team_id` (and game/unit context) and are cleaned up on unmount.
- Service-role usage is server-only and rare; prefer RLS-compliant queries with user tokens.
- Avoid N+1 in Server Components; batch queries or use views where necessary.
- Streaming/partial rendering is fine when it keeps TTFB low without exposing partial sensitive data.

## Performance & UX
- Favor SSR/edge for fast TTFB; code-split heavy client bundles and avoid oversized JSON payloads.
- Maintain low-latency dashboards: paginate lists, stream data where possible, avoid loading whole seasons at once.
- Provide robust loading/error/empty states aligned with the dark, glassy UI and accessible semantics.
- Keep motion minimal and purposeful; respect reduced-motion preferences.
- Make all interactive elements keyboard accessible; focus-visible styles required.

## Compliance & Quality
- Strict TypeScript with linting/formatting clean; no `any` or unchecked `@ts-ignore`.
- Tests (unit/integration/Playwright) should cover critical flows; CI must stay green before merge.
- Log and handle Supabase/OpenAI/Stripe errors defensively; never leak secrets in responses or telemetry.
- Document assumptions in code comments only where non-obvious (e.g., tenancy derivation, edge constraints).
- Observe rate limits and timeouts for external services; surface graceful fallbacks in UI.
