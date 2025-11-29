"use client"

import { useEffect } from 'react'
import { CTAButton } from '@/components/ui/CTAButton'
import { ErrorState } from '@/components/ui/ErrorState'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App route error boundary triggered')
  }, [])

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
