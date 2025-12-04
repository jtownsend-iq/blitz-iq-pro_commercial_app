# Auth Flows

## Scope
- Covers signup/login/reset and onboarding entry points; uses Supabase Auth exclusively.
- No secret keys or privileged clients here—only public auth interactions and redirects.
- Ensure flows work on mobile and low-bandwidth connections; keep assets small and avoid heavy scripts.

## Auth Enforcement
- Always check `supabase.auth.getUser()` server-side; unauthenticated users redirect to `/login` immediately.
- Never trust client-provided IDs; profile/team context is resolved after login, not before.
- Block authenticated users from hitting login/signup except when resetting passwords; redirect to `(app)` shell when already signed in.
- CSRF-safe actions only; rely on Supabase Auth helpers and avoid custom token handling here.

## Form Handling
- Validate all form data with shared schemas (Zod or equivalent) before invoking Supabase Auth.
- Accessible forms: proper labels, `aria-invalid` on errors, clear helper/error text, and focus-visible states matching `InputField`/`CTAButton`.
- Show explicit loading/disabled states while submitting; mirror signup form behavior for consistency.
- Surface errors inline and concisely; avoid leaking technical details.
- Support password visibility toggles with accessible labels; keep password rules clear.
- Enforce debounce/throttle on repeated submits to avoid spam and rate-limit hits.

## UX & Safety
- Keep flows minimal and mobile-friendly; use semantic buttons for submit actions.
- Do not store or echo secrets; only exchange auth credentials with Supabase Auth endpoints.
- After auth, redirect to onboarding or the user’s `activeTeamId` context to establish tenancy before showing protected content.
- Provide localized error copy where available; avoid jargon in auth errors.
- Respect dark/glass visual system; keep contrast sufficient for accessibility.
- Use friendly empty/loading states (skeletons/spinners) while session is being resolved.

## Testing & Telemetry
- Cover signup/login/reset success and failure paths with tests; mock Supabase Auth responses where needed.
- Track anonymized telemetry for flow drop-offs and auth errors (no credentials/PII); ensure logging cannot expose secrets.
- Verify redirects for authenticated/unauthenticated states in integration tests (Playwright).
