# Telemetry & Observability

## Purpose
- Collect analytics/observability signals only—never PII, secrets, or auth tokens.
- Payloads must be small, structured JSON; truncate any potentially large fields.
- Use consistent event names, timestamps, and correlation IDs to join with logs when debugging.
- Focus on operational metrics: API latency, realtime propagation delay, import outcomes, AI failures, client-side error counts.

## Access & Security
- Telemetry tables intentionally have RLS disabled; writes occur via server-side service-role clients only.
- API access must remain narrowly scoped; never expose service-role keys to clients.
- Enforce auth or signed shared secrets on telemetry endpoints to prevent abuse.
- Validate origin if applicable to avoid accepting spoofed telemetry.

## Data Handling
- Validate inputs; reject malformed or oversized payloads with 400.
- Log key events: errors, game/session lifecycle (start/end), imports, AI failures, realtime latency, API latency.
- Do not leak stack traces in responses; keep detailed logs server-side only.
- Drop or redact any field that resembles credentials or PII; defensive coding over convenience.
- Include team context only when necessary and derived server-side; never trust client-provided `team_id`.

## Integration
- Align with `telemetry.server` utilities; ensure consistent event names and schemas.
- Support future SLO/metrics needs (e.g., time from chart event submit to UI display).
- Design for forwarding to production tools (Sentry/Datadog/etc.) without changing client contracts.
- Keep payload schemas versioned; add fields backward-compatibly and document deprecations.

## Performance & Reliability
- Keep writes lightweight and non-blocking; never let telemetry failures break user flows.
- Consider batching or background insertion for noisy signals; apply rate limits if necessary.
- Use time-based retention/partitioning on telemetry tables to control size and keep indexes efficient.
- Monitor insertion error rates and set alerts; treat sustained failures as incidents.
- Provide graceful degradation on ingest overload (drop oldest, backpressure) without impacting core user flows.
