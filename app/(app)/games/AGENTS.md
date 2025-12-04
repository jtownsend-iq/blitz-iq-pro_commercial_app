# Games & Live Charting

## Lifecycle
- Supports pre-game creation, live charting via `game_sessions` + `chart_events`, and post-game summaries/drive snapshots.
- Distinguish Drive vs Series as separate fields in DB, validation, and UI state; never conflate.
- Game metadata should include season/opponent/unit context; keep filters consistent across lists and feeds.

## Multi-Tenancy & Access
- All queries/writes include `team_id = activeTeamId`; validate loaded games/sessions/events belong to the active team.
- Role gating for privileged operations (creating games, editing summaries) follows shared role constants.
- Never accept `team_id` from the client; derive and inject server-side.

## Live Charting & Realtime
- Insert events via server actions/route handlers; do not trust client-only writes.
- Supabase Realtime subscriptions filter by `team_id` and game/unit context; tear down listeners on unmount to avoid duplicate updates.
- Use pagination/limits for feeds and event queries; never load full seasons or entire event history at once.
- Optimistic UI on play submit with clear error states and gentle retry if realtime confirmation lags.

## AI Analyst Integration
- Use `getAiTendenciesAndNextCall` and `generateDriveSummary` server-side; strict JSON parsing with try/catch and safe fallbacks.
- AI output must be labeled as AI; treat as untrusted text and never execute or persist blindly.
- Cache/persist AI summaries where appropriate to avoid redundant calls mid-game.
- If AI is unavailable, provide clear local/fallback messaging and continue charting uninterrupted.

## UX & Performance
- Maintain low latency for live views; debounce/batch event updates when high frequency.
- Provide empty/loading/error states for dashboards, live feed, and summaries.
- Ensure responsiveness for sideline devices; minimize payload sizes and avoid heavyweight client loops.
- Keep keyboard shortcuts/touch affordances consistent for rapid charting; avoid accidental duplicate submissions.

## Testing & Telemetry
- Cover game creation, chart event ingestion, realtime propagation, and AI fallback flows with tests where feasible.
- Telemetry should record session start/stop, insert failures, AI errors, and latency from submit to UI display (no secrets/PII).
