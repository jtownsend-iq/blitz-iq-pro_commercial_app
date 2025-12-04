# Scouting & CSV Ingest

## Scope & Tenancy
- All scouting data is scoped by `team_id` plus opponent/season context; enforce `team_id = activeTeamId` on every query and write.
- Role checks apply for imports/edits based on shared role constants; UI gating must match server enforcement.

## CSV Upload & Validation
- CSV uploads flow through server route handlers/server actions only; never parse/write directly from the client.
- Validate file presence/type/size before processing; reject oversized or unsupported files early.
- Use normalization/validation utilities (e.g., `utils/scout/ingest.ts`, `parseIntBounded`, string trimming, enum guards).
- Collect row-level errors and return them without failing the entire batch; errors should be user-visible and actionable.
- Chunk Supabase inserts; prefer UPSERT where deduplication is required. Always include `team_id` and opponent/season keys in payloads.
- Never store raw/unvalidated CSV rows; only normalized, typed data reaches the DB.

## Schema & Evolution
- New scouting fields or formats must update normalization utilities and DB schema in lockstep (via migrations).
- Maintain enums and bounded numerics; avoid free-form text for structured attributes.
- Index `team_id`, opponent/season identifiers, and common filters to keep scouting queries fast.
- Revisit denormalized summaries/materialized views when adding new metrics; keep refresh costs reasonable.

## UX & Resilience
- Provide clear progress, success, and error states for imports; keep forms accessible and consistent (InputField, CTAButton).
- Optimize for large files: streaming parse where possible, avoid loading entire files into memory.
- Support retry-safe behavior: idempotent imports/UPSERTs prevent duplicates on reconnects.
- Allow download/export flows to respect the same filters and `team_id` scoping.
- Keep list and table views paginated/virtualized to handle large scouting datasets.

## Testing & Telemetry
- Add tests for normalization edge cases, bounded parsing, and row-level error reporting.
- Telemetry should record import start/finish, error counts, and rejection reasons (no PII/secret leakage).
- Include regression tests when adding new CSV columns or enum values to ensure backward compatibility.
