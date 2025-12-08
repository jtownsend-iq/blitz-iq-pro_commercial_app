## Pull Request Checklist - BlitzIQ Pro

**Before submitting your PR, ensure all items are checked:**

### 🎨 **UI/UX Requirements**

- [ ] **Uses design tokens** - All spacing, colors, radii, shadows use tokens from `lib/ui/tokens.ts` or Tailwind theme
- [ ] **No ad-hoc styling** - No inline styles or one-off utility combinations outside the design system
- [ ] **Component states** - All interactive components have hover, active, focus, disabled, and loading states
- [ ] **Focus indicators** - All interactive elements have visible focus rings (`focus-visible:ring-2 focus-visible:ring-brand/60`)
- [ ] **Motion preferences** - Animations respect `prefers-reduced-motion` (use `motion-reduce:` utilities)

### ♿ **Accessibility (A11y)**

- [ ] **ARIA attributes** - Proper `aria-label`, `aria-describedby`, `aria-live`, `role` where needed
- [ ] **Keyboard navigation** - All interactive elements accessible via keyboard (Tab, Enter, Space, Escape)
- [ ] **Form labels** - All inputs have associated labels (visible or `aria-label`)
- [ ] **Error announcements** - Form errors use `role="alert"` or `aria-live="polite"`
- [ ] **Color contrast** - Text meets WCAG AA (4.5:1 for normal, 3:1 for large text)
- [ ] **Screen reader tested** - Quick check with macOS VoiceOver or NVDA

### 📱 **Responsive Design**

- [ ] **Mobile tested** - UI works on mobile viewport (375px width minimum)
- [ ] **Tablet tested** - UI works on tablet viewport (768px width)
- [ ] **Desktop tested** - UI works on desktop (1280px+ width)
- [ ] **Primary actions visible** - Key CTAs remain accessible across all breakpoints
- [ ] **No horizontal scroll** - Content fits within viewport without overflow

### 🔄 **States & Feedback**

- [ ] **Loading states** - Skeleton loaders or spinners for async operations
- [ ] **Empty states** - Meaningful empty states with next action guidance
- [ ] **Error states** - Inline errors with clear recovery steps
- [ ] **Success feedback** - Confirmations for important actions (toast, modal, inline message)
- [ ] **Destructive confirmations** - Delete/remove actions require confirmation dialog

### 🧪 **Testing**

- [ ] **TypeScript passes** - No type errors (`npm run typecheck`)
- [ ] **Linting passes** - No ESLint errors (`npm run lint`)
- [ ] **Unit tests** - New logic has unit test coverage
- [ ] **A11y tests** - Run `npm run test:a11y` on affected pages (no critical/serious violations)
- [ ] **Manual QA** - Feature tested in development mode

### 🔐 **Security & Tenancy**

- [ ] **Server-side validation** - All inputs validated server-side, not just client-side
- [ ] **Tenant isolation** - Uses `requireTenantContext` for protected routes/actions
- [ ] **No client-supplied team IDs** - Team context derived server-side only
- [ ] **RLS verified** - Database queries respect Row Level Security (if touching data layer)

### 📊 **Performance**

- [ ] **No layout shift** - Images/media have width/height or aspect ratio set
- [ ] **Optimized images** - Next.js Image component with proper `sizes` attribute
- [ ] **No console errors** - Clean browser console (no errors/warnings)
- [ ] **Bundle size** - No unexpected large dependencies added

### 📝 **Documentation**

- [ ] **Code comments** - Complex logic has explanatory comments
- [ ] **Props documented** - TypeScript types fully annotated
- [ ] **README updated** - If adding new features, update relevant docs

---

### 🎯 **Definition of Done**

This PR is ready to merge when:
- All checkboxes above are checked ✅
- At least one code review approval received
- CI/CD pipeline passes (tests, lint, build)
- No blocking feedback from reviewers

---

**Additional Notes:**
- For destructive actions, always use `ConfirmDialog` component
- For user feedback, use `Toast` notifications (accessible via `useToast()` hook)
- For modals, use `Modal` component (includes focus trapping and keyboard handling)
- For form inputs, use `InputField`, `Select`, `Checkbox`, or `Radio` components

**Need help?** Check `docs/ui-ux-standards.md` or ask in #engineering
