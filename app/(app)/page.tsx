import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const outcomes = [
    'Tag every snap in under 10 seconds.',
    'Save 4–6 hours of Sunday breakdown per game.',
    'Give your staff a shared picture of opponent tendencies before Tuesday install.',
    'One Elite program per region gets the clearest view of region opponents.',
  ]

  const capabilityGroups = [
    {
      title: 'Live charting on the sideline',
      body:
        'Hash, field zone, formation, personnel, motion, result — captured in seconds with clean tags so coordinators can call the next play with confidence.',
    },
    {
      title: 'Scouting ingest & tendencies',
      body:
        'Upload opponent games or use our CSV template. Filter by down/distance, hash, tags, and see next-call odds without re-entering film room data.',
    },
    {
      title: 'Player development & availability',
      body:
        'Track status, pitch counts, goals, and notes so coaches align on who is ready, limited, or out before kickoff.',
    },
    {
      title: 'Multi-team, multi-role control',
      body:
        'HC/OC/DC/ST/Analyst/AD roles, district-level tenants, and audit-friendly controls so data stays isolated and staff get exactly what they need.',
    },
  ]

  const plans = [
    {
      name: 'BlitzIQ Pro: Elite Sideline',
      short: 'Elite',
      tagline: 'One Elite program per region, per season.',
      bullets: [
        'Regional exclusivity for the season.',
        'Full BlitzIQ Pro live analytics engine.',
        'White-glove onboarding and deeper support.',
      ],
      bestFor: 'Varsity staffs who want a protected edge on every region opponent.',
      ctaLabel: 'Check Elite availability in your region',
      ctaHref: '#contact',
      featured: true,
    },
    {
      name: 'BlitzIQ Pro: Varsity',
      short: 'Varsity',
      tagline: 'Full BlitzIQ Pro engine for most varsity staffs.',
      bullets: [
        'Live sideline charting in under 10 seconds per play.',
        'Tendency views and reports for scouting and self-scout.',
        'Works alongside your existing film workflows.',
      ],
      bestFor: 'Varsity programs ready to bring analytics to the sideline.',
      ctaLabel: 'Get the demo deck & walkthrough',
      ctaHref: '#resources',
      featured: false,
    },
    {
      name: 'BlitzIQ Pro: Starter',
      short: 'Starter',
      tagline: 'Core tools for smaller staffs and developing programs.',
      bullets: [
        'Essential charting and tendency reports.',
        'Simple setup and usage.',
        'Connect Starter programs to the same language and framework.',
      ],
      bestFor: 'Starter programs, JV, freshman, or budget-constrained staffs.',
      ctaLabel: 'Get Starter details',
      ctaHref: '#resources',
      featured: false,
    },
  ]

  return (
    <main className="bg-surface text-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-14 lg:py-18">
        <section className="grid gap-10 md:gap-14 md:grid-cols-[1.2fr_minmax(0,1fr)] items-start">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.24em] text-brand-soft">
              <span className="h-1 w-4 rounded-full bg-brand" />
              Engineered to Destroy Egos.
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-slate-50">
                Make the call everyone else wishes they had.
              </h1>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                BlitzIQ Pro™ gives high school and college staffs live sideline charting in under 10
                seconds per play, next-call odds on critical downs, and clean scouting/season views.
                Elite Sideline is limited to one program per region, per season. Varsity and Starter
                are open to all.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-brand text-black text-xs md:text-sm font-semibold tracking-[0.14em] uppercase px-6 py-3 hover:bg-brand-soft transition-colors focus:outline-none focus:ring-2 focus:ring-brand/60"
              >
                Check Elite availability in your region
              </Link>
              <Link
                href="#resources"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 text-xs md:text-sm font-semibold tracking-[0.14em] uppercase px-6 py-3 text-slate-200 hover:border-brand hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                Get the demo deck & film breakdown sample
              </Link>
            </div>
            <div className="grid gap-3 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>Tag every snap in under 10 seconds; no re-entering data on Sunday.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>See tendencies and stress-beaters before the opponent adjusts.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>One Elite Sideline program per region, per season. Varsity/Starter open to all.</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-surface-muted/70 backdrop-blur-sm p-5 shadow-brand-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-14">
                  <Image
                    src="/blitziq-logo.png"
                    alt="BlitzIQ Pro logo"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-100">BlitzIQ Pro™</p>
                  <p className="text-[0.7rem] text-slate-500">Sideline + Scouting preview</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/15 text-emerald-300 text-[0.65rem] px-2 py-1 border border-emerald-500/30">
                High-trust
              </span>
            </div>

            <div className="space-y-4 text-sm text-slate-200">
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                <p className="text-[0.8rem] text-slate-300 mb-1.5">
                  Live call probability: 3rd &amp; 6, right hash
                </p>
                <p className="text-sm font-semibold text-slate-50">
                  Likely call: Field flood concept (70% confidence)
                </p>
                <p className="text-[0.75rem] text-slate-500 mt-1">
                  Weighted by last 40 snaps, formation, personnel, down/distance.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[0.8rem]">
                <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                  <p className="text-slate-300 mb-1">Charting tempo</p>
                  <p className="text-slate-100 font-semibold">~9s per snap</p>
                  <p className="text-slate-500 mt-1">Tag hash, formation, family, result on one surface.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                  <p className="text-slate-300 mb-1">Adjustment cues</p>
                  <p className="text-slate-100 font-semibold">Live recommendations</p>
                  <p className="text-slate-500 mt-1">Front tweaks, coverage tags, likely opponent counters.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                <p className="text-[0.8rem] text-slate-300 mb-1">Season context</p>
                <p className="text-[0.8rem] text-slate-500">
                  Game plans, tendencies, and player notes stay synced from camp installs through playoffs.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3.5 text-[0.8rem] text-slate-500">
              <p>Built for staffs moving between film, spreadsheets, and the sideline.</p>
              <Link
                href="#resources"
                className="text-[0.75rem] font-semibold text-brand hover:text-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/40 rounded-full px-2"
              >
                Get the deck
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-3">
          <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">Outcomes</p>
          <h2 className="text-2xl font-semibold text-slate-50">Clarity before critical downs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {outcomes.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-slate-200 text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 space-y-3">
          <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">Capabilities</p>
          <h2 className="text-2xl font-semibold text-slate-50">Built for real football staffs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {capabilityGroups.map((cap) => (
              <div
                key={cap.title}
                className="rounded-2xl border border-slate-800 bg-surface-muted/50 p-4 space-y-2"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-brand-soft">{cap.title}</p>
                <p className="text-sm text-slate-300 leading-relaxed">{cap.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="plans" className="mt-16 space-y-3">
          <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">Pick your plan</p>
          <h2 className="text-2xl font-semibold text-slate-50">BlitzIQ Pro™ tiers</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.short}
                className={`rounded-2xl border ${
                  plan.featured ? 'border-brand shadow-brand-card' : 'border-slate-800'
                } bg-black/30 p-5 space-y-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{plan.short}</p>
                    <h3 className="text-xl font-semibold text-slate-50">{plan.name}</h3>
                    <p className="text-sm text-slate-400">{plan.tagline}</p>
                  </div>
                  {plan.featured && (
                    <span className="rounded-full bg-brand/15 text-brand text-[0.65rem] px-3 py-1 border border-brand/50">
                      Exclusive
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-slate-200">
                  {plan.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Best for: {plan.bestFor}
                </p>
                <Link
                  href={plan.ctaHref}
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] focus:outline-none focus:ring-2 ${
                    plan.featured
                      ? 'bg-brand text-black hover:bg-brand-soft focus:ring-brand/60'
                      : 'border border-slate-700 text-slate-200 hover:border-brand hover:text-brand focus:ring-brand/40'
                  }`}
                >
                  {plan.ctaLabel}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-slate-800 bg-black/20 p-5 space-y-3">
          <h3 className="text-xl font-semibold text-slate-50">
            What “one Elite program per region” means
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            If your staff signs BlitzIQ Pro: Elite Sideline, we do not sign another Elite school in your
            region for that season. Varsity and Starter remain available in the region; exclusivity applies
            only to Elite. Renew by the agreed date and you keep the Elite spot for the next season.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="#contact"
              className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black focus:outline-none focus:ring-2 focus:ring-brand/60"
            >
              Check Elite availability in your region
            </Link>
            <Link
              href="#resources"
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              Get the demo deck & playbook
            </Link>
          </div>
        </section>

        <section id="security" className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1fr)] items-start">
          <div className="space-y-3">
            <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">
              Security, trust, and multi-tenant control
            </p>
            <h2 className="text-2xl font-semibold text-slate-50">
              Built for ADs, district leads, and serious staffs
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tenant isolation with RLS, role-based access for HC/OC/DC/ST/Analyst/AD, audit-friendly
              actions, backup/export paths, and SSO/SAML trajectory. Uptime SLAs and support options align
              with your season calendar.
            </p>
            <div className="grid gap-2">
              {[
                'Per-team isolation with audited queries and exports.',
                'Fine-grained roles for coordinators, analysts, and administrators.',
                'SSO/SAML path, uptime targets, and support aligned to game weeks.',
                'Data stays portable: exports, CSV templates, and controlled sharing.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            id="resources"
            className="rounded-2xl border border-slate-800 bg-black/25 p-5 space-y-4"
            aria-label="Self-education resources"
          >
            <p className="text-sm font-semibold text-slate-100">
              Self-educate without booking a call
            </p>
            <div className="space-y-2 text-sm text-slate-300">
              <p>Download the demo deck, a sample film breakdown, and a 3-minute sideline walkthrough.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="#contact"
                className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black focus:outline-none focus:ring-2 focus:ring-brand/60"
              >
                Get the demo deck & film breakdown sample
              </Link>
              <Link
                href="#contact"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                Watch the 3-minute sideline walkthrough
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              Prefer a call? Request one and we’ll schedule based on staff capacity.
            </p>
          </div>
        </section>

        <section id="contact" className="mt-16 rounded-2xl border border-slate-800 bg-black/25 p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Check Elite availability</h2>
          <p className="text-sm text-slate-300">
            No free trials or calendar spam. Share the basics and we’ll confirm Elite slots or send the deck
            and walkthrough for Varsity/Starter.
          </p>
          <form className="grid gap-4 md:grid-cols-2">
            {[
              { label: 'Name', name: 'name', type: 'text', required: true },
              { label: 'Role', name: 'role', type: 'text', required: true },
              { label: 'School', name: 'school', type: 'text', required: true },
              { label: 'State', name: 'state', type: 'text', required: true },
              { label: 'Classification', name: 'classification', type: 'text', required: true },
              { label: 'Region', name: 'region', type: 'text', required: true },
              { label: 'Email', name: 'email', type: 'email', required: true },
            ].map((field) => (
              <label key={field.name} className="space-y-1 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">{field.label}</span>
                <input
                  type={field.type}
                  name={field.name}
                  required={field.required}
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ))}
            <label className="space-y-1 text-xs text-slate-400 md:col-span-2">
              <span className="uppercase tracking-[0.2em]">Plan of interest</span>
              <select
                name="plan"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                defaultValue="Elite"
              >
                <option value="Elite">Elite</option>
                <option value="Varsity">Varsity</option>
                <option value="Starter">Starter</option>
              </select>
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
              >
                Check availability
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-700 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                Get the demo deck & playbook
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-full px-3"
              >
                Request a call with our team
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
