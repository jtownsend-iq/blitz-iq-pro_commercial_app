# UI/UX Excellence Plan

Purpose: make the product feel intentional, consistent, and production-ready without regressions.

## Principles
- System-first: one set of tokens for spacing, radii, typography, color roles, shadows, and motion.
- Predictable rhythm: 4/8px spacing grid, consistent line heights, and constrained widths for symmetry.
- Accessibility equals quality: WCAG AA contrast, keyboard-first, screen-reader labels, and motion preferences respected.
- Feedback everywhere: loading, empty, error, success, and offline states are first-class.
- Performance as UX: no layout shift, responsive images, prefetch likely next routes, avoid blocking work.

## Standards (what “done” means)
- Tokens: spacing, radii, font scale, color roles, z-index, shadows, motion defined once (e.g., Tailwind theme) and used in all components.
- Layouts: limited templates (dashboard, list, detail, settings) with fixed gutters, max-widths, and section spacing; alignment consistent across breakpoints.
- Components: buttons, inputs, selects, tables, cards, modals, sheets, toasts, tabs, chips—each with states (default/hover/active/disabled/processing) and focus rings; hit areas ≥44px.
- States: skeletons for async, empty-state content with next actions, inline errors with aria-live, success confirmations; destructive actions require confirmation.
- Content: concise labels, helper text where needed, consistent capitalization; avoid jargon; tooltips sparingly.
- Motion: purposeful 150–250ms easing; respect “prefers-reduced-motion”; no jitter on hover/press.
- Accessibility: label every control, focus order matches visual order, skip links, form errors announced, tables have headers; contrast AA; keyboard access everywhere.
- Responsiveness: mobile-first; primary actions stay visible; avoid reflow that breaks hierarchy; ensure grid/list density is tuned per breakpoint.
- Performance: set width/height on media to prevent CLS; use responsive images; defer non-critical JS; guard expensive effects; cache/prefetch probable next routes.

## Process & Gates
- Design/dev sync: Figma components map 1:1 to coded components; no ad hoc per-page styling.
- PR checklist: tokens-only styling, a11y checks (axe), loading/error/empty states present, responsive check (mobile + desktop), visual diff on key screens.
- Testing: visual regression on templates, Lighthouse budgets for LCP/CLS/INP, automated a11y lint + spot axe run on critical flows, cross-browser smoke (Chromium/Firefox/WebKit).

## Build Plan (execute in order)
1) Codify tokens: align Tailwind/theme with spacing/radii/typography/color/motion tokens; document in `tokens.ts` and Tailwind config.
2) Core components: buttons, inputs, selects, checkbox/radio, textarea, toast, modal/sheet, card, table; implement states and focus.
3) Layout templates: dashboard shell (nav + content), list + filters, detail view, settings form; set max-widths and gutters.
4) States & content: add skeletons, empty states, inline errors, and success to key flows; add destructive confirmations; audit copy for consistency.
5) Accessibility pass: audit forms, tables, navigation; add skip link, focus trapping in modals, aria-live for async; enforce AA contrast.
6) Responsiveness & motion: tune spacing per breakpoint; ensure primary actions remain visible; add gentle motion respecting reduced-motion.
7) Guardrails: add PR checklist to repo, ensure a11y lint + axe and Lighthouse budgets in CI; add visual regression on key pages.

## Definition of Ready (per story)
- Designs use existing tokens/components; breakpoints and states specified; empty/error/success defined; copy approved.

## Definition of Done (per story)
- Uses system tokens/components; passes keyboard + screen-reader checks; includes loading/error/empty; responsive on mobile/desktop; no layout shift; no new console errors; tests/visuals updated.

## Implemented foundations (code)
- Tokens live in `lib/ui/tokens.ts` and power shared components.
- Canonical controls: `components/ui/Button` (aka `CTAButton`) with variants/states and `components/ui/InputField` with labels/aria/error handling.
- Skeleton primitive: `components/ui/Skeleton` for loading states.
