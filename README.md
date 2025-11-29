# BlitzIQ Pro – Developer Guide

## Setup
- Install dependencies: `npm install`
- Create `.env.local` with:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_ELITE`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `OPENAI_API_KEY`
  - `TELEMETRY_VERIFY_TOKEN` (server ingest verification)
  - Optional test helpers: `TEST_TEAM_ID`, `TEST_EMAIL`, `TEST_PASSWORD`

## Commands
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Unit tests (config/gateway): `npm run test:unit`
- Integration tests (Supabase): `npm run test:integration`
- Smoke tests (Playwright): `npm run test:smoke`
- Build: `npm run build`
- Start production build: `npm run start`

## Database
- Migrations live in `supabase/migrations`.
- Apply locally with Supabase CLI: `supabase db reset` (destructive) or `supabase db push`.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set before running integration tests.

## Deployment
- Provide all env vars above to your hosting platform (Vercel/Render/etc.).
- Run `npm run build` in CI; fail on lint/type errors.
- Supabase service role keys stay server-side; only the publishable key is exposed to the browser.
