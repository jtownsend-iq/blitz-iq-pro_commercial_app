# Settings & Roles

## Scope & Tenancy
- All settings belong to the current `activeTeamId`; every query/write includes `team_id = activeTeamId`.
- Validate membership before rendering; block or redirect non-members.
- Derive team context server-side; never accept `team_id` from the client or query string.

## Role Enforcement
- Use shared role constants (e.g., TEAM_MANAGER_ROLES) to gate invitations, plan changes, and team profile edits.
- Server actions/route handlers must enforce roles in addition to UI gating; never rely on client-only checks.
- Log/telemetry sensitive changes (role updates, billing changes) without leaking secrets.
- Stripe/billing flows must use server-side route handlers/webhooks; never expose secret keys or client-only mutations for plan changes.
- Invitation acceptance should verify membership and prevent cross-team leakage or reuse of expired tokens.

## Data Handling
- Use server actions for sensitive updates; validate inputs with Zod schemas before writing.
- Keep forms accessible and consistent (InputField, CTAButton, aria labels, disabled/loading states).
- Avoid accepting client-supplied `team_id`; derive it server-side from the profile.
- Store branding assets securely (public buckets with signed URLs if needed) and scope uploads by team.
- For staff management, enforce unique membership constraints and prevent removing the last owner/admin.

## UX & Performance
- Provide clear feedback on save success/failure; include retry guidance for transient errors.
- Keep payloads small; paginate or lazy-load staff lists where needed.
- Respect dark glass aesthetic with clear affordances for permissions and plan status.
- Surface role restrictions in UI (disabled buttons/tooltips) while maintaining server enforcement.
- Offer safe undo/backout paths for risky actions (role downgrades, invite revocation) when feasible.

## Testing
- Cover role gating, invite flows, and plan/settings mutations with tests where feasible; ensure CI stays green.
- Verify telemetry fires for critical mutations and that PII/secrets are excluded.
- Include regression tests for billing webhook handling and membership edge cases.
