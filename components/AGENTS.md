# Shared Components

## Design Language
- Dark, glassy dashboard aesthetic with brand cyan accents; use Tailwind tokens from `tailwind.config.ts`.
- Semantic HTML always: buttons for actions, headings for structure, lists for collections.
- Accessibility: `aria-label` on icon-only buttons, `aria-invalid` on invalid inputs, focus-visible states (CTAButton patterns).
- Maintain contrast for dark mode; respect prefers-reduced-motion.
- Keep spacing and typography consistent with global styles; avoid inline hard-coded colors.

## Scope
- Components like `LiveEventFeed`, `CTAButton`, `InputField`, dashboard tiles, nav/shell pieces.
- Client Components only when interactivity/realtime is required; otherwise prefer Server Components.
- Accept data and handlers via props; avoid hidden global dependencies or implicit team context.
- Keep props typed and minimal; use discriminated unions for variant-heavy components.

## Responsiveness & Motion
- Use grid/flex with Tailwind breakpoints; avoid fixed widths that break on mobile/tablet.
- Apply Framer Motion sparingly for lightweight animations (e.g., fade-in for new plays) without harming performance.
- Defer heavy effects until after first paint; guard animations behind feature flags if performance regresses.

## Data & Multi-Tenancy
- Do not embed team IDs or secrets; components receive derived `activeTeamId`/data from parents.
- Realtime components must accept pre-filtered channels/data rather than opening unscoped subscriptions inside.
- Ensure list/feed components support pagination/virtualization hooks instead of loading everything at once.

## UX Patterns
- Provide clear loading/empty/error states consistent with the rest of the app.
- Keep forms consistent (InputField, CTAButton) with disabled/loading states and concise inline errors.
- Avoid heavy client loops; paginate or virtualize when rendering large lists/feeds.
- Expose aria-live regions where updates are important (scores, live events) without overwhelming screen readers.
- Make interactive icons keyboard-activatable and describable.

## Quality
- Strict TypeScript with explicit props; no `any` or unchecked `@ts-ignore`.
- Add unit tests for logic-heavy components; snapshot cautiously for stable layouts only.
- Storybook-style examples should reflect real data shapes and tenant scoping; avoid leaking secrets in fixtures.
