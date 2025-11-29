"use client"

import { useEffect } from 'react'
import { CTAButton } from '@/components/ui/CTAButton'
import { ErrorState } from '@/components/ui/ErrorState'
import { trackEvent } from '@/utils/telemetry'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    trackEvent('app_error_boundary', { digest: error?.digest ?? null, message: error?.message ?? null })
  }, [error])

  return (
    <div className="app-container py-10">
      <ErrorState
        title="Something broke in BlitzIQ Pro"
        description="We hit an unexpected error. Try again or head back to the dashboard."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CTAButton onClick={reset} variant="primary">
              Try again
            </CTAButton>
            <CTAButton href="/dashboard" variant="secondary">
              Go to dashboard
            </CTAButton>
          </div>
        }
      />
    </div>
  )
}
