"use client"

export default function GameChartLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50" role="status" aria-live="polite">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4 space-y-3">
          <div className="h-3 w-40 skeleton" />
          <div className="h-7 w-64 skeleton" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-5 w-28 skeleton" />
            <div className="h-5 w-28 skeleton" />
            <div className="h-5 w-32 skeleton" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(360px,1fr))]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="h-4 w-32 skeleton" />
              <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="h-16 w-full skeleton" />
                ))}
              </div>
              <div className="mt-3 h-32 w-full skeleton" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="h-4 w-40 skeleton" />
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-14 w-full skeleton" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="h-4 w-36 skeleton" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-14 w-full skeleton" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="h-4 w-32 skeleton" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-12 w-full skeleton" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
