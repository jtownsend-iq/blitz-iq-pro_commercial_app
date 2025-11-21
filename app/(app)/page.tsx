import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-surface text-slate-50">
      <div className="max-w-5xl w-full px-4 py-14 grid gap-10 md:gap-14 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start">
        {/* Left: Hero copy */}
        <section className="space-y-6">
          <p className="text-[0.75rem] uppercase tracking-[0.2em] text-brand-soft">
            Built for high school and college football staffs
          </p>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-slate-50">
            Faster calls. Smarter adjustments. Less chaos on game day.
          </h1>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed">
            BlitzIQ Pro keeps your staff aligned with live charting in seconds, clear probabilities for the next call, and a single place to manage game plans, tendencies, and players all season. Built so coaches can react faster and make the right call when it matters.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand text-black text-xs md:text-sm font-semibold tracking-[0.14em] uppercase px-6 py-3 hover:bg-brand-soft transition-colors"
            >
              Request early access - limited spots
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 text-xs md:text-sm font-semibold tracking-[0.14em] uppercase px-6 py-3 text-slate-200 hover:border-brand hover:text-brand transition-colors"
            >
              Log in
            </Link>
          </div>

          <div className="grid gap-3 sm:gap-2 text-sm text-slate-400 pt-3">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
              <span>Chart every snap in seconds from the sideline - no re-entering data Monday morning.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
              <span>See next-call probabilities and stress-beaters before the opponent adjusts.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
              <span>Run game plans, season trends, and player notes from one place across the whole staff.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
              <span>Built for offense, defense, and special teams working together - not separate tools.</span>
            </div>
          </div>
        </section>

        {/* Right: Product preview card */}
        <section className="relative">
          <div className="rounded-2xl border border-slate-800 bg-surface-muted/70 backdrop-blur-sm p-5 shadow-brand-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="relative h-8 w-12">
                  <Image
                    src="/blitziq-logo.png"
                    alt="BlitzIQ Pro logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-100">BlitzIQ Pro</p>
                  <p className="text-[0.7rem] text-slate-500">Game day preview</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 text-emerald-300 text-[0.65rem] px-2 py-1 border border-emerald-500/30">
                Early access
              </span>
            </div>

            <div className="space-y-4">
              {/* Next call prediction */}
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                <p className="text-[0.8rem] text-slate-300 mb-1.5">
                  Live call probability: 3rd &amp; 6, right hash
                </p>
                <p className="text-sm font-semibold text-slate-50">
                  Likely call: Field flood concept (70% confidence)
                </p>
                <p className="text-[0.75rem] text-slate-500 mt-1">
                  Weighted by last 40 snaps, formation, personnel, and down/distance.
                </p>
              </div>

              {/* Quick charting + adjustments */}
              <div className="grid grid-cols-2 gap-3 text-[0.8rem]">
                <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                  <p className="text-slate-300 mb-1">Charting tempo</p>
                  <p className="text-slate-100 font-semibold">~9s per snap (offense)</p>
                  <p className="text-slate-500 mt-1">
                    Tag formation, motion, family, and result from one surface.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                  <p className="text-slate-300 mb-1">Adjustment cues</p>
                  <p className="text-slate-100 font-semibold">3 live recommendations</p>
                  <p className="text-slate-500 mt-1">
                    Coverage tags, front tweaks, and likely opponent counters.
                  </p>
                </div>
              </div>

              {/* Season & player context */}
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                <p className="text-[0.8rem] text-slate-300 mb-1">Season context</p>
                <p className="text-[0.8rem] text-slate-500">
                  Keep game plans, tendencies, and player notes synced from camp installs through playoffs.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3.5">
              <p className="text-[0.75rem] text-slate-500">
                Built for staffs moving between Hudl, spreadsheets, and whiteboards today.
              </p>
              <Link
                href="/signup"
                className="text-[0.75rem] font-semibold text-brand hover:text-brand-soft"
              >
                Request access
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

