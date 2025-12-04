# Utilities

## Scope
- Pure helpers and server utilities: auth (`requireAuth`/team guards), telemetry.server, AI helpers (`getTendencies`, `generateDriveSummary`), scouting ingest, formatting/parsers.
- Prefer side-effect-light functions; separate pure logic from IO to keep testing simple.

## Typing & Documentation
- Strict TypeScript with explicit return types; avoid `any` and casual `@ts-ignore`.
- Add concise JSDoc for non-trivial helpers (AI prompt builders, CSV parsers, auth guards) describing inputs/outputs and assumptions.
- Keep function signatures small and composable; avoid configuration sprawl without defaults.

## Multi-Tenancy & Security
- Never trust client-provided `team_id`; derive/validate against profile membership.
- Utilities must respect RLS expectations; avoid embedding service-role logic unless explicitly for server-only paths.
- Strip secrets/PII from telemetry/logging helpers; default to redaction.
- Provide helpers to standardize `team_id` filtering and membership checks to reduce drift across features.

## AI Helpers
- Prompts are concise, structured, and de-identified where possible (numeric stats, down/distance, tendencies).
- Use the shared OpenAI client (gpt-4o-mini or configured model); parse JSON responses with try/catch and provide deterministic fallbacks.
- Label AI output as untrusted; never execute or interpolate into queries without validation.
- Cache/persist expensive AI results to reduce repeated calls.
- Enforce timeouts and rate limits when wrapping AI calls; bubble actionable errors to callers.

## Scouting Helpers
- Normalize and validate CSV rows (trimming, enums, bounds checks) before persistence.
- Collect row-level errors; never abort the whole import for isolated bad rows.
- Keep ingest utilities aligned with schema/enums; update together when formats change.
- Include opponent/season context consistently in derived keys to avoid duplicate rows.

## Telemetry Helpers
- Lightweight, non-blocking logging; swallow telemetry failures rather than impacting user flows.
- Enforce truncation and schema for event payloads; exclude secrets/PII.
- Support correlation IDs and timestamps to join telemetry with server logs.

## Testing
- Add focused unit tests for parsing/normalization/AI parsing utilities; keep CI green.
- Use fixtures covering edge cases (bounds, enum mismatches, malformed JSON) to prevent regressions.
