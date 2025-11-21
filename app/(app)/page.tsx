import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-surface text-slate-50">
      <div className="max-w-5xl w-full px-4 py-12 grid gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center">
        {/* Left: Hero copy */}
        <section className="space-y-6">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-soft">
            BlitzIQ Pro | High School & College Football
          </p>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Engineered to destroy egos. Built for real-time in-game adjustments.
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-xl">
            BlitzIQ Pro gives your staff sub-10-second in-game charting, OpenAI-powered
            call predictions, and live adjustment recommendations. Designed for high
            school and college programs that want a real edge on Friday and Saturday
            without adding hours of post-game busywork.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand text-black text-xs font-semibold tracking-[0.16em] uppercase px-6 py-3 hover:bg-brand-soft transition-colors"
            >
              Request early access
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 text-xs font-semibold tracking-[0.16em] uppercase px-6 py-3 text-slate-200 hover:border-brand hover:text-brand transition-colors"
            >
              Log in
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 text-[0.7rem] text-slate-500 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>9-second charting on offense and defense - live on the sideline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>OpenAI-powered call predictions with target 90%+ accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>Game planning, season management, and player development in one place</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span>Built for both sides of the ball - OC, DC, and special teams</span>
            </div>
          </div>
        </section>

        {/* Right: Product preview card */}
        <section className="relative">
          <div className="rounded-2xl border border-slate-800 bg-surface-muted/60 backdrop-blur-sm p-4 shadow-brand-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-12">
                  <Image
                    src="/blitziq-logo.png"
                    alt="BlitzIQ Pro"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-100">BlitzIQ Pro</p>
                  <p className="text-[0.65rem] text-slate-500">
                    In-game charting & prediction preview
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 text-emerald-300 text-[0.6rem] px-2 py-1 border border-emerald-500/30">
                Early access
              </span>
            </div>

            <div className="space-y-3">
              {/* Next call prediction */}
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[0.7rem] text-slate-400 mb-1">
                  Live call prediction - 3rd &amp; 6, hash right
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  Likely play: Field-side flood concept (70% confidence)
                </p>
                <p className="text-[0.7rem] text-slate-500 mt-1">
                  Based on last 40 snaps, formation, personnel, and down-and-distance.
                </p>
              </div>

              {/* Quick charting + adjustments */}
              <div className="grid grid-cols-2 gap-3 text-[0.7rem]">
                <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                  <p className="text-slate-400 mb-1">In-game charting</p>
                  <p className="text-slate-100 font-medium">
                    9s per snap avg (offense)
                  </p>
                  <p className="text-slate-500 mt-1">
                    Formation | motion | play family | result, all from one screen.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                  <p className="text-slate-400 mb-1">Adjustment engine</p>
                  <p className="text-slate-100 font-medium">
                    3 live recommendations
                  </p>
                  <p className="text-slate-500 mt-1">
                    Suggested coverage tags, front tweaks, and call tendencies.
                  </p>
                </div>
              </div>

              {/* Season & player context */}
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3">
                <p className="text-[0.7rem] text-slate-400 mb-1">
                  Season & player development
                </p>
                <p className="text-[0.7rem] text-slate-500">
                  Track calls, tendencies, and player evals across the season - from
                  camp installs to playoff prep.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
              <p className="text-[0.65rem] text-slate-500">
                Built for staffs that live in Hudl, spreadsheets, and whiteboards today.
              </p>
              <Link
                href="/signup"
                className="text-[0.65rem] font-semibold text-brand hover:text-brand-soft"
              >
                Get early access ->
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}



