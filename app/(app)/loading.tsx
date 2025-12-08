"use client"

export default function AppGroupLoading() {
  return (
    <div className="app-container py-10 space-y-6" role="status" aria-live="polite">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.9)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3 w-full max-w-2xl">
              <div className="h-3 w-32 skeleton" />
              <div className="h-8 w-64 skeleton" />
              <div className="h-4 w-80 skeleton" />
              <div className="flex flex-wrap gap-2">
                <div className="h-7 w-28 skeleton" />
                <div className="h-7 w-32 skeleton" />
                <div className="h-7 w-36 skeleton" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 skeleton" />
              <div className="h-10 w-28 skeleton" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_22px_70px_-38px_rgba(0,0,0,0.75)]"
          >
            <div className="h-3 w-24 skeleton" />
            <div className="mt-3 h-8 w-28 skeleton" />
            <div className="mt-2 h-4 w-32 skeleton" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_70px_-40px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 skeleton" />
              <div className="h-5 w-10 skeleton" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-6 w-24 skeleton" />
              <div className="h-4 w-full skeleton" />
              <div className="h-4 w-3/4 skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
