# BlitzIQ Pro – Agent Charter

You are working on BlitzIQ Pro, a commercial, multi-tenant, live football analytics SaaS. Treat this document as a binding contract. Do not give partial plans, pseudo-code, or half-finished refactors. Your job is to ship production-grade code that can be dropped into the repo and run.

---

## 1. Vision and Differentiators

- BlitzIQ Pro is a live American football game charting and analytics platform that must clearly outperform legacy tools on:
  - Live usability and latency for charting and dashboards.
  - AI-assisted decision support (tendencies, suggestions, reports).
  - Polished, consistent, ADHD-friendly UX.
- The product unifies:
  - Live in-game charting for offense, defense, and special teams.
  - CSV-based scouting and season-over-season analytics.
  - AI analyst workflows that are practical and immediately actionable for real coaches.
- Every surface must feel like a premium, award-level sports SaaS product, not a prototype, starter template, or admin scaffold.

---

## 2. Stack and Architecture

- Next.js App Router with TypeScript and Node 22.
- Tailwind CSS and shadcn/ui for all UI. Do not introduce additional UI frameworks.
- Supabase (Postgres, Auth, Realtime) is the single shared database.
- Stripe is the billing provider for multi-tenant plans.
- OpenAI is used for AI features, and API usage stays server-side.
- Schema changes live in `supabase/migrations` (and related SQL) and must not exist only in ad hoc queries.
- Server Components handle data fetching and composition where possible. Client Components are used only when interactivity, realtime subscriptions, or browser APIs are required.

---

## 3. Multi-Tenancy and Security

- Every tenant-scoped domain table must carry a `team_id` (and season where appropriate).
- Derive `activeTeamId` from authenticated membership and current team context. Do not trust IDs passed from the client without verification.
- All queries, mutations, and realtime subscriptions must be constrained by `team_id = activeTeamId` (and season where needed).
- Supabase RLS is mandatory on tenant tables. RLS policies must:
  - Use `auth.uid()` where appropriate.
  - Mirror membership and role checks from `team_members` or equivalent tables.
- Service-role keys are server-only and used sparingly for controlled operations such as imports, system jobs, and telemetry. Do not expose them to the client.
- Do not log secrets, API keys, or PII. Logs and telemetry must never leak sensitive information.

---

## 4. UX and UI Principles

You must implement UX that is focused, fast, and consistent. Minimal default UI is not acceptable anywhere in the product.

- Use Tailwind CSS and shadcn/ui only. All views must be fully styled, with intentional spacing, typography, and states that match the existing design language.
- Maintain a consistent shell: active team, season, and context must be visible in the app shell on every route.

For live game views:

- The high-level layout regions and core control positions must be consistent across Offense, Defense, Special Teams, and the All overview. The header, unit tabs, left situational and charting pane, and right feed and analytics pane must occupy stable locations so coaches build muscle memory.
- Each unit view is a distinct workspace:
  - Offense must expose offensive-specific metrics, tendencies, and charting controls defined in the product spec, with offensive priorities driving the layout and emphasis.
  - Defense must expose defensive-specific metrics, tendencies, and charting controls defined in the product spec, with defensive priorities driving the layout and emphasis.
  - Special Teams must expose special-teams-specific metrics, tendencies, and charting controls defined in the product spec, with kicking, punting, field position, and non-offensive scoring driving the layout and emphasis.
  - The All view must present a synthesized overview without flattening units into a generic template.
- Do not reuse the same metric sets or generic content across Offense, Defense, and Special Teams. Only the structural frame and interaction patterns are shared. Content, metrics, and controls must be unit-specific.
- The primary focus in each unit is the current situation, fast charting, and a small set of high-value metrics. Respect the HUD limits and placements defined in the spec and phases.
- Secondary metrics and detail must live in clearly labeled expandable sections or secondary panels, not clutter the always-visible HUD.
- Avoid dense data tables in live contexts. Use concise rows, chips, and tags that highlight what matters (explosive plays, turnovers, critical downs, red zone events).

For dashboards:

- Above the fold, the dashboard must be restricted to:
  - A hero strip that locks in team and opponent context, kickoff or status, a freshness indicator, and a single primary CTA determined by context.
  - A core metrics band with the specified three or four tiles from the stats engine.
  - Unit cards for Offense, Defense, and Special Teams with unit-specific key metrics and one primary action.
  - A sessions list focused on quick scanning.
  - A short live feed showing recent plays.
- Do not add generic widgets, extra panels, or stock SaaS patterns outside this structure. If you add new information, it must be integrated into the defined structure, not bolted on.

For settings:

- Provide clear Quick Settings for common, high-impact tasks.
- Provide structured Advanced Settings for deep configuration.
- Do not expose settings as an unstyled list of inputs or a generic admin console. Settings must look and behave like they belong to BlitzIQ Pro.

ADHD-specific design requirements:

- Core controls for each unit must stay in fixed positions across Offense, Defense, Special Teams, and All. Do not move primary actions between tabs.
- Limit always-visible metrics. Put non-essential metrics into explicit secondary sections.
- Every action (save, start, stop, import, etc.) must show clear, consistent feedback.
- Avoid visual noise, random color usage, and unnecessary animations.

---

## 5. Coding Standards and Tooling

- Use strict TypeScript everywhere. Do not introduce `any` or `@ts-ignore` except in extremely rare cases where it is impossible to model types, and document the reason in a code comment.
- Follow the existing ESLint and Prettier configurations. Formatting is enforced by Prettier.
- This project uses npm exclusively:
  - Use `npm install` to install dependencies.
  - Use `npm run <script>` for all scripts.
  - Do not use pnpm, yarn, bun, or any other package manager even as a suggestion.
- When you reference lint, test, build, or format flows, use the actual scripts defined in `package.json` and invoke them via npm.
- Maintain clean imports:
  - Remove unused imports.
  - Keep imports logically ordered and consistent with existing patterns.
- New modules must have descriptive names and follow existing project patterns for folder and file organization.

---

## 6. Safe Refactor Rules

When refactoring, you must behave like a senior engineer performing controlled surgery on a live system:

- Before changing a file, determine its responsibilities, inputs, outputs, and consumers.
- Do not introduce breaking changes to public interfaces without updating all call sites in the same change. No broken intermediate states are acceptable.
- When you change shared utilities, types, or hooks:
  - Update all affected imports.
  - Fix all resulting type errors and compile-time issues.
- Do not leave commented-out code, dead code, obsolete props, or partial implementations in any file you touch.
- For any file you modify, output the complete final version, ready to paste and run. Do not output only diffs or fragments.
- When multiple approaches are available, choose the one that aligns with existing architecture, is maintainable, and is performant. Do not choose shortcuts that reduce code quality or consistency.
- When given a concrete refactor or implementation task, you must deliver the implementation, not just analysis or plans. Planning text is secondary; the final result must be working code.

---

## 7. Data, Metrics, and Analytics

- BlitzIQ Pro uses a shared stats engine and analytics layer. All metrics referenced in the product spec and phase documents must be implemented there.
- Core box score metrics, core winning metrics, and advanced analytics such as:
  - Turnover margin and turnover differential.
  - Success rate and explosive play rates.
  - Points per drive and points per possession.
  - EPA, WPA, QBR-style ratings, SP-plus-style efficiency, havoc rate.
  - Season projections and related season-level probabilities.
- These must:
  - Live in dedicated, well-named functions or modules.
  - Accept clear typed inputs and produce typed outputs.
  - Be covered by unit tests using small, synthetic scenarios where expected results are exactly known.

UI components must consume these metrics via typed props or hooks and must only format and present them. Do not recompute or approximate heavy metrics in React components.

---

## 8. Performance and Resilience

- Avoid N+1 queries. Use joins, batching, and appropriate data-fetching strategies.
- Index tenant and filter columns such as `team_id`, `season_id`, `game_id` when access patterns require them.
- Paginate lists that can grow large (games, plays, logs) rather than loading entire histories into the client.
- For live data:
  - Use realtime subscriptions and stale-while-revalidate patterns where they are appropriate.
  - Use skeleton loaders for complex content that is expected to load shortly.
  - Implement clear Fresh, Stale, and Offline states based on last successful update timestamps.
  - Handle temporary network issues gracefully, preserving user intent and avoiding duplicate writes or double submissions.
- Live charting paths must preserve play entries during short network disruptions and must avoid generating duplicate records.

---

## 9. Accessibility and Motion

Accessibility is a non-negotiable requirement.

- All interactive surfaces must be fully keyboard navigable.
- Every interactive element must have a visible focus state that matches the design system; do not rely on default browser outlines alone.
- Tabs, feeds, dialogs, and composite components must have correct ARIA roles, labels, and relationships.
- Live feeds must use appropriate ARIA live region settings so updates are announced without overwhelming screen readers.
- Color and contrast must meet at least WCAG AA for critical text and controls.
- Do not use color as the only way to convey state or status. Use text and icons as needed.
- Respect user motion preferences:
  - Check reduced-motion preferences where relevant.
  - Use minimal, purposeful animations only.
  - Avoid constant motion or decorative animation in live workspaces.

---

## 10. Testing and Verification

You must maintain and extend test coverage as you work. Code that would obviously fail linting, type-checking, or tests is not acceptable.

- Add or update unit tests for:
  - Stat and analytics functions such as turnover margin, red zone performance, success rate, explosive rate, points per drive, EPA and adjusted EPA, adjusted net yards per attempt, QBR-style metrics, havoc rate, box score generation, and season projections.
- Add or update component or integration tests for:
  - Dashboard views and core metrics band.
  - Game workspaces for Offense, Defense, Special Teams, and All.
  - Season analytics views and per-game charts.
  - Box score and summary components.
- Tests must be deterministic and based on small, clear data sets with exact expected values.
- When you change behavior or add features, you must update or add tests so that the new behavior is explicitly verified.

---

## 11. Behavior Rules for This Agent

These rules control how you must behave while working on BlitzIQ Pro:

- You must treat this charter and the detailed phase specifications as binding requirements, not suggestions.
- When the user asks you to implement or refactor something, you must produce complete, ready-to-paste code for all affected files, not just commentary and planning.
- You must not leave placeholders, TODO comments, stubbed-out functions, or incomplete flows in any area covered by the product spec and phases.
- You must not simplify away required metrics, UX patterns, or workflows because they are complex. Where details are intricate, you must make a coherent decision aligned with existing patterns and implement it fully.
- For each change request, you must:
  - Implement the solution completely.
  - Maintain or improve type-safety, lint cleanliness, and formatting.
  - Maintain or improve test coverage where relevant.
- Do not introduce new dependencies or frameworks unless the user explicitly instructs you to do so.
- When you describe or add UI text for labels, buttons, or headings, write them clearly without wrapping them in quotes in your instructions or code comments. Treat them as real product copy, not placeholders.

You must always deliver complete, polished, production-quality work that respects BlitzIQ Pro’s architecture, multi-tenant requirements, domain-specific analytics, and UX standards. Minimal, basic, or lazy solutions are a failure under this charter.
