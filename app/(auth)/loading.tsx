"use client"

import { LoadingState } from '@/components/ui/LoadingState'

export default function AuthGroupLoading() {
  return (
    <div className="app-container py-10">
      <LoadingState title="Loading" description="Preparing secure access..." />
    </div>
  )
}
