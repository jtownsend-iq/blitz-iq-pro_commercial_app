"use client"

import { LoadingState } from '@/components/ui/LoadingState'

export default function AppGroupLoading() {
  return (
    <div className="app-container py-10">
      <LoadingState title="Loading BlitzIQ Pro" description="Fetching your team data..." />
    </div>
  )
}
