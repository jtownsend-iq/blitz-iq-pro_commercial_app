"use client"

import { useEffect } from 'react'
import { CTAButton } from '@/components/ui/CTAButton'
import { ErrorState } from '@/components/ui/ErrorState'
import { trackEvent } from '@/utils/telemetry'

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    trackEvent('auth_error_boundary', { digest: error?.digest ?? null, message: error?.message ?? null })
  }, [error])

  return (
    <div className="app-container py-10">
      <ErrorState
        title="We hit an error signing you in"
        description="Please try again or return to the login page."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CTAButton onClick={reset} variant="primary">
              Try again
            </CTAButton>
            <CTAButton href="/login" variant="secondary">
              Back to login
            </CTAButton>
          </div>
        }
      />
    </div>
  )
}
