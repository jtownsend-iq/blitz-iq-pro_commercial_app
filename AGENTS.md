# BlitzIQ Pro Ground Rules

## Vision & Differentiators
- Multi-tenant, real-time football analytics SaaS that beats Hudl on latency, AI-assisted decision support, and polished UX.
- Live game charting + AI analyst + CSV-driven scouting unified in one workspace with season-over-season context.
- Designed for staff-on-the-sideline resiliency: optimistic flows, gentle retries, and offline-friendly fallbacks for critical inputs.

## Stack & Architecture
- Next.js 13+ App Router, TypeScript, Node 22, Supabase (Postgres + Auth + Realtime), Tailwind, Stripe, OpenAI (gpt-4o-mini).
- Server Components for data, Client Components only when interactivity or realtime subscription is needed.
- Supabase is the single shared DB; schema changes live only in `supabase/migrations`.
- Service-role clients are server-only and rare (telemetry, controlled imports); all access respects RLS.

## Multi-Tenancy & Security
- Every domain row carries `team_id`; derive `activeTeamId` from profile/membership, never trust client-provided IDs.
- All queries and realtime channels filter by `team_id = activeTeamId`; enforce membership/role checks server-side before use.
- RLS is mandatory on tenant tables; policies mirror membership (`team_members`) + `auth.uid()` checks.

## Core Pillars
- Real-time responsiveness: low-latency charting, live dashboards, and tidy cleanup of Realtime subscriptions.
- AI-backed decision support: tendencies, next-play recs, drive summaries; strict JSON parsing with safe fallbacks.
- Polished UX: dark glass aesthetic, cyan accents, accessible semantics, clear loading/error/empty states, sensible motion.
- CSV scouting: robust ingest with normalization, bounded parsing, row-level errors, and chunked writes.
- Season-over-season and pre/post-game workflows: keep data model and UI extensible for longitudinal analysis.

## Coding Bar & Quality
- Strict TypeScript; no `any` or casual `@ts-ignore`. ESLint/Prettier clean before merge.
- Tests expected (unit/integration/Playwright where relevant); CI must pass before landing.
- Performance-first: avoid N+1, paginate, index tenant + filter columns, code-split, minimize client payloads.
- Telemetry and error logging are required; never leak secrets/PII in logs or telemetry.

## Integration Notes
- Stripe and OpenAI calls stay server-side in route handlers/server actions; secrets come from env only.
- Offline/poor network paths should preserve user intent (queued writes or retries) without duplicating data.
- New features must align with multi-tenant RLS, realtime expectations, CSV/AI/telemetry foundations, and the existing dashboard look/feel.
