# New UI Components - Usage Guide

This guide shows how to use the newly added UI components in BlitzIQ Pro.

## 📦 Components Added

### 1. **Modal** - Accessible dialogs with focus trapping
### 2. **Toast** - Notification system with context provider
### 3. **ConfirmDialog** - Confirmation dialogs for destructive actions
### 4. **Select** - Custom select with keyboard navigation
### 5. **Checkbox** - Accessible checkbox component
### 6. **Radio/RadioGroup** - Radio button components
### 7. **Enhanced EmptyState** - Better default empty states
### 8. **Mobile Navigation** - Hamburger menu in AppShell

---

## 🎯 Usage Examples

### Modal

```tsx
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

function MyComponent() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Player"
        description="Update player information below"
        size="md"
      >
        <div className="space-y-4">
          <p>Your modal content here...</p>
        </div>
        
        <ModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
```

### Toast Notifications

**1. Add ToastProvider to your root layout:**

```tsx
// app/layout.tsx or app/(app)/layout.tsx
import { ToastProvider } from '@/components/ui/Toast'

export default function Layout({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
}
```

**2. Use in any component:**

```tsx
'use client'
import { useToast } from '@/components/ui/Toast'

function MyComponent() {
  const toast = useToast()

  const handleSave = async () => {
    try {
      await saveData()
      toast.success('Saved!', 'Your changes have been saved.')
    } catch (error) {
      toast.error('Failed to save', error.message)
    }
  }

  return <Button onClick={handleSave}>Save</Button>
}
```

### ConfirmDialog (Destructive Actions)

```tsx
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState } from 'react'

function DeleteButton({ gameId }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteGame(gameId)
      toast.success('Game deleted')
    } catch (error) {
      toast.error('Failed to delete', error.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setConfirmOpen(true)}
      >
        Delete Game
      </Button>
      
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete this game?"
        description="This will permanently delete all plays, stats, and charts. This action cannot be undone."
        confirmLabel="Delete Game"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleting}
      />
    </>
  )
}
```

### Select Component

```tsx
import { Select } from '@/components/ui/Select'
import { useState } from 'react'

function FormationSelector() {
  const [formation, setFormation] = useState('')

  const options = [
    { value: '11-personnel', label: '11 Personnel' },
    { value: '12-personnel', label: '12 Personnel' },
    { value: '21-personnel', label: '21 Personnel', disabled: true },
  ]

  return (
    <Select
      label="Formation"
      value={formation}
      onChange={setFormation}
      options={options}
      placeholder="Select formation..."
      error={error}
    />
  )
}
```

### Checkbox

```tsx
import { Checkbox } from '@/components/ui/Checkbox'

function SettingsForm() {
  const [enabled, setEnabled] = useState(false)

  return (
    <Checkbox
      checked={enabled}
      onChange={(e) => setEnabled(e.target.checked)}
      label="Enable real-time sync"
      description="Automatically sync data across all devices"
    />
  )
}
```

### Radio Group

```tsx
import { RadioGroup } from '@/components/ui/Radio'

function PreferenceSelector() {
  const [view, setView] = useState('grid')

  return (
    <RadioGroup
      label="Display Mode"
      name="view-mode"
      value={view}
      onChange={setView}
      options={[
        { value: 'grid', label: 'Grid View', description: 'Display items in a grid' },
        { value: 'list', label: 'List View', description: 'Display items in a list' },
        { value: 'table', label: 'Table View', description: 'Display items in a table' },
      ]}
    />
  )
}
```

### Enhanced Empty State

```tsx
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Trophy } from 'lucide-react'

function GamesList({ games }) {
  if (games.length === 0) {
    return (
      <EmptyState
        icon={
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
            <Trophy className="h-6 w-6 text-brand" />
          </div>
        }
        title="No games yet"
        description="Start by creating your first game to begin charting plays and tracking stats."
        action={
          <Button href="/games/new" variant="primary">
            Create First Game
          </Button>
        }
      />
    )
  }

  return <div>{/* games list */}</div>
}
```

---

## 🎨 Design System Integration

All components:
- ✅ Use design tokens from `lib/ui/tokens.ts`
- ✅ Include proper focus states with brand ring
- ✅ Respect `prefers-reduced-motion`
- ✅ Have ARIA attributes for accessibility
- ✅ Support keyboard navigation
- ✅ Include loading/disabled states

---

## ♿ Accessibility Features

### Modal
- Focus trap (tab cycles within modal)
- Focus restoration (returns to trigger on close)
- ESC to close
- Click backdrop to close (configurable)
- Proper ARIA roles and labels

### Toast
- `role="status"` and `aria-live="polite"`
- Screen reader announcements
- Keyboard dismissible
- Auto-dismiss with configurable duration

### Select
- Full keyboard navigation (arrows, home, end)
- ARIA combobox pattern
- Highlighted option scrolls into view
- Proper focus management

### Checkbox/Radio
- Hidden native input with custom styled label
- Keyboard accessible
- Screen reader compatible
- Error announcements

---

## 📱 Responsive Behavior

### Mobile Navigation
- Hamburger menu automatically shows on mobile (`md:hidden`)
- Full-screen overlay menu
- Closes on navigation
- Touch-friendly tap targets (44px minimum)

### Modals
- Responsive sizing (`sm`, `md`, `lg`, `xl`)
- Adapts to viewport on mobile
- Scrollable content area

---

## 🚀 Next Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add ToastProvider to your layout** (see example above)

3. **Run type check:**
   ```bash
   npm run typecheck
   ```

4. **Test accessibility:**
   ```bash
   npm run test:a11y
   ```

5. **Run Lighthouse:**
   ```bash
   npm run lighthouse
   ```

---

## 🔧 Configuration

### Motion Preferences
Global CSS now includes `@media (prefers-reduced-motion: reduce)` rules.
All animations automatically disabled for users who prefer reduced motion.

### Lighthouse Budgets
See `lighthouserc.js` for performance budgets:
- LCP < 2.5s
- CLS < 0.1
- FCP < 2s
- A11y score > 90%

---

## 📚 Documentation

- **UI/UX Standards**: `docs/ui-ux-standards.md`
- **Tenant Isolation**: `docs/tenant-isolation.md`
- **PR Checklist**: `.github/PULL_REQUEST_TEMPLATE.md`

---

## ⚠️ Important Notes

1. **Always use ConfirmDialog for destructive actions** (delete, remove, archive)
2. **Use Toast for user feedback** (success, error, info, warning)
3. **Use Modal for forms and dialogs** (not for destructive confirmations)
4. **Respect motion preferences** - all new components already do this
5. **Test keyboard navigation** - Tab, Enter, Space, Escape should work everywhere

---

## 🐛 Troubleshooting

**Toast not showing?**
- Ensure `ToastProvider` wraps your app
- Check you're using `'use client'` directive
- Verify you're calling `useToast()` inside the provider

**Modal focus trap not working?**
- Ensure focusable elements exist inside modal
- Check there are no conflicting `tabIndex={-1}` attributes

**Select keyboard nav issues?**
- Verify options array has unique `value` properties
- Check you're not preventing default on keyboard events elsewhere

---

Need help? Check existing implementations or ask in #engineering!
