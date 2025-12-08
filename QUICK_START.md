# ✅ Quick Start Checklist - New UI Components

## Step 1: Install Dependencies ✅ READY
```bash
cd c:\dev\blitz\blitz-iq-pro
npm install
```
This will install `@lhci/cli` for Lighthouse testing.

## Step 2: Add ToastProvider 🔴 REQUIRED
Update your app layout to include the ToastProvider:

**File:** `app/(app)/layout.tsx`

```tsx
import { ToastProvider } from '@/components/ui/Toast'

export default async function AppLayout({ children }: { children: ReactNode }) {
  // ... existing code ...

  return (
    <AuthProvider value={auth}>
      <TelemetryBootstrap />
      <ToastProvider>  {/* ADD THIS */}
        <AppShell
          navItems={navItems}
          shellConfig={{ variant: 'app', showFooter: true }}
          teamContext={teamContext}
        >
          {children}
        </AppShell>
      </ToastProvider>  {/* ADD THIS */}
    </AuthProvider>
  )
}
```

## Step 3: Test It Out ✅ READY

### Test Modal:
```tsx
'use client'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

function TestModal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Test Modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="It works!">
        <p>Your modal is working perfectly! ✨</p>
        <ModalFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
```

### Test Toast:
```tsx
'use client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

function TestToast() {
  const toast = useToast()
  return (
    <div className="flex gap-2">
      <Button onClick={() => toast.success('Success!', 'It works!')}>
        Test Success
      </Button>
      <Button onClick={() => toast.error('Error!', 'This is an error')}>
        Test Error
      </Button>
      <Button onClick={() => toast.info('Info', 'Just FYI')}>
        Test Info
      </Button>
      <Button onClick={() => toast.warning('Warning', 'Be careful!')}>
        Test Warning
      </Button>
    </div>
  )
}
```

### Test Select:
```tsx
'use client'
import { Select } from '@/components/ui/Select'
import { useState } from 'react'

function TestSelect() {
  const [value, setValue] = useState('')
  return (
    <Select
      label="Choose Formation"
      value={value}
      onChange={setValue}
      options={[
        { value: '11', label: '11 Personnel' },
        { value: '12', label: '12 Personnel' },
        { value: '21', label: '21 Personnel' },
      ]}
    />
  )
}
```

### Test Mobile Nav:
1. Open app in browser
2. Resize to mobile width (< 768px)
3. Click hamburger menu icon (top right)
4. Verify menu slides in
5. Click a link, menu should close

## Step 4: Run Quality Checks ✅ READY

```bash
# Type check (should pass for new components)
npm run typecheck

# Lint check
npm run lint

# Accessibility tests
npm run test:a11y

# Lighthouse (after you have the app running)
npm run lighthouse
```

## Step 5: Start Using in Production 🚀

### For Destructive Actions:
Replace any delete/remove buttons with ConfirmDialog:

**Before:**
```tsx
<Button onClick={handleDelete}>Delete</Button>
```

**After:**
```tsx
const [confirmOpen, setConfirmOpen] = useState(false)

<Button onClick={() => setConfirmOpen(true)}>Delete</Button>
<ConfirmDialog
  open={confirmOpen}
  onClose={() => setConfirmOpen(false)}
  onConfirm={handleDelete}
  title="Delete this item?"
  description="This action cannot be undone."
  variant="destructive"
/>
```

### For User Feedback:
Replace console.log or alerts with toasts:

**Before:**
```tsx
try {
  await saveData()
  alert('Saved!')
} catch (error) {
  alert('Error: ' + error.message)
}
```

**After:**
```tsx
const toast = useToast()

try {
  await saveData()
  toast.success('Saved!', 'Your changes have been saved.')
} catch (error) {
  toast.error('Failed to save', error.message)
}
```

### For Forms:
Use new form components:

**Checkboxes:**
```tsx
import { Checkbox } from '@/components/ui/Checkbox'

<Checkbox
  checked={enabled}
  onChange={(e) => setEnabled(e.target.checked)}
  label="Enable feature"
/>
```

**Radios:**
```tsx
import { RadioGroup } from '@/components/ui/Radio'

<RadioGroup
  name="mode"
  value={mode}
  onChange={setMode}
  options={[
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]}
/>
```

**Selects:**
```tsx
import { Select } from '@/components/ui/Select'

<Select
  value={selected}
  onChange={setSelected}
  options={options}
/>
```

## ✅ You're Done!

Your app now has:
- ✅ Professional modal dialogs
- ✅ Toast notifications
- ✅ Confirmation dialogs for safety
- ✅ Accessible form controls
- ✅ Mobile navigation
- ✅ Motion preferences support
- ✅ Lighthouse CI for performance
- ✅ PR checklist for quality

## 📚 Need Help?

- **Full usage guide:** `docs/new-components-guide.md`
- **Implementation details:** `IMPLEMENTATION_SUMMARY.md`
- **Component examples:** IntelliSense will show you all props
- **PR checklist:** `.github/PULL_REQUEST_TEMPLATE.md`

## 🎯 Priority Quick Wins

1. **Add ToastProvider** (Step 2 above) - 30 seconds
2. **Test one component** (Step 3) - 2 minutes
3. **Replace one destructive action** with ConfirmDialog - 5 minutes
4. **Add success toast** to one form - 3 minutes

**Total time to see value: ~10 minutes** ⚡

Ready to ship! 🚀
