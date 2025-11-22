'use client'

import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Plan = 'Elite' | 'Standard'
type Intent = 'elite_availability' | 'demo_deck' | 'call_request'

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('Elite')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successIntent, setSuccessIntent] = useState<Intent | null>(null)
  const intentRef = useRef<Intent>('demo_deck')
  const planRef = useRef<Plan>('Elite')

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const setIntentAndScroll = useCallback(
    (nextIntent: Intent, nextPlan: Plan) => {
      intentRef.current = nextIntent
      planRef.current = nextPlan
      setSelectedPlan(nextPlan)
      setSuccessIntent(null)
      scrollToSection('contact')
    },
    [scrollToSection]
  )

  const successCopy = useMemo<Record<Intent, string>>(
    () => ({
      elite_availability:
        'We’ve got your info. We’ll confirm Elite availability in your region and follow up by email.',
      demo_deck: 'We’ll send the demo deck and sample breakdown so you can see how it fits your staff.',
      call_request: 'We’ll follow up to schedule a call based on your availability.',
    }),
    []
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmitting(true)
      setError(null)
      setSuccessIntent(null)

      const form = event.currentTarget
      const formData = new FormData(form)

      const required = [
        'name',
        'role',
        'school',
        'state',
        'classification',
        'region',
        'email',
      ]
      for (const field of required) {
        const val = formData.get(field)
        if (typeof val !== 'string' || !val.trim()) {
          setError(`${field} is required`)
          setSubmitting(false)
          return
        }
      }

      const payload = {
        name: String(formData.get('name') || '').trim(),
        role: String(formData.get('role') || '').trim(),
        school: String(formData.get('school') || '').trim(),
        state: String(formData.get('state') || '').trim(),
        classification: String(formData.get('classification') || '').trim(),
        region: String(formData.get('region') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        plan: planRef.current,
        intent: intentRef.current,
      }

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json?.error || 'Failed to send your info.')
        }
        setSuccessIntent(intentRef.current)
        form.reset()
        planRef.current = 'Elite'
        setSelectedPlan('Elite')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        setError(message)
      } finally {
        setSubmitting(false)
      }
    },
    []
  )

  return (
    <main className="bg-surface text-slate-50 min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-900/60 bg-black/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-12">
              <Image src="/blitziq-logo.png" alt="BlitzIQ Pro logo" fill className="object-contain" />
            </div>
            <span className="text-sm font-semibold tracking-wide">BlitzIQ Pro™</span>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-xs uppercase tracking-[0.18em] text-slate-300">
            {[
              { label: 'Outcomes', id: 'outcomes' },
              { label: 'Capabilities', id: 'capabilities' },
              { label: 'Plans', id: 'plans' },
              { label: 'Security', id: 'security' },
              { label: 'Contact', id: 'contact' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-full px-2 py-1 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setIntentAndScroll('elite_availability', 'Elite')}
            className="rounded-full bg-brand px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
          >
            Check Elite availability
          </button>
        </div>
        <div className="md:hidden border-t border-slate-900/60 bg-black/80">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto text-[0.7rem] uppercase tracking-[0.18em] text-slate-300">
            {[
              { label: 'Outcomes', id: 'outcomes' },
              { label: 'Capabilities', id: 'capabilities' },
              { label: 'Plans', id: 'plans' },
              { label: 'Security', id: 'security' },
              { label: 'Contact', id: 'contact' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-full px-3 py-1 bg-slate-900/60 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

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
                Analyst in the box tags each snap in about 10 seconds and feeds the sideline with answers on
                money downs. See next-call tendencies before they break the huddle, and keep everyone aligned
                from Friday through Tuesday install. Elite Sideline is one per region; Standard covers
                everyone else.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIntentAndScroll('elite_availability', 'Elite')}
                className="inline-flex items-center justify-center rounded-full bg-brand text-black text-xs md:text-sm font-semibold tracking-[0.14em] uppercase px-6 py-3 hover:bg-brand-soft transition-colors focus:outline-none focus:ring-2 focus:ring-brand/60"
              >
                Check Elite availability in your region
              </button>
              <button
                type="button"
                onClick={() => setIntentAndScroll('demo_deck', 'Standard')}
                className="inline-flex items-center justify-center rounded-full border border-slate-700 text-xs md:text-sm font-semibold tracking-[0.14em] uppercase px-6 py-3 text-slate-200 hover:border-brand hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                Get the demo deck & film breakdown sample
              </button>
            </div>
            <div className="grid gap-3 text-sm text-slate-400">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>Tag every snap in under 10 seconds from the box; no re-entering data on Sunday.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>See next-call probabilities and stress-beaters before the opponent adjusts.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>Run game plans, season trends, and player notes from one place across the whole staff.</span>
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
                  <p className="text-xs font-semibold text-slate-100">BlitzIQ Pro</p>
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
                <p className="text-slate-500 mt-1">Tag formation, motion, family, and result from one surface.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
                <p className="text-slate-300 mb-1">Adjustment cues</p>
                <p className="text-slate-100 font-semibold">3 live recommendations</p>
                <p className="text-slate-500 mt-1">
                  Coverage tags, front tweaks, and likely opponent counters.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-black/40 p-3.5">
              <p className="text-[0.8rem] text-slate-300 mb-1">Season context</p>
              <p className="text-[0.8rem] text-slate-500">
                Keep game plans, tendencies, and player notes synced from camp installs through playoffs.
              </p>
            </div>
          </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-3.5 text-[0.8rem] text-slate-500">
              <p>Built for staffs moving between Hudl, spreadsheets, and whiteboards today.</p>
              <button
                type="button"
                onClick={() => setIntentAndScroll('demo_deck', 'Standard')}
                className="text-[0.75rem] font-semibold text-brand hover:text-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/40 rounded-full px-2"
              >
                Get the deck
              </button>
            </div>
          </div>
        </section>

        <section id="outcomes" className="mt-16 space-y-3">
          <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">Outcomes</p>
          <h2 className="text-2xl font-semibold text-slate-50">Clarity before critical downs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'Tag every snap from the box in about 10 seconds; sideline gets answers before 3rd-and-6.',
              'Save 4â€“6 hours of Sunday breakdown per game; walk into Monday ahead.',
              'Give your staff a shared picture before Tuesday install.',
              'One Elite Sideline program per region, per season.',
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-slate-200 text-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section id="capabilities" className="mt-16 space-y-3">
          <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">Capabilities</p>
          <h2 className="text-2xl font-semibold text-slate-50">Built for real football staffs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              'In-game charting from the box feeding the sideline with hash, field/boundary, formation, personnel, result.',
              'Scouting ingest with filters for down/distance/hash/formation/personnel; see next-call odds without re-entering film.',
              'Player availability, pitch counts, tags, and notes so everyone knows who is ready.',
              'Multi-team, multi-role control for HC/OC/DC/ST/Analyst/AD with clean tenant isolation.',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-surface-muted/50 p-4 space-y-2"
              >
                <p className="text-sm text-slate-300 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="plans" className="mt-16 space-y-3">
          <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">Pick your plan</p>
          <h2 className="text-2xl font-semibold text-slate-50">BlitzIQ Pro™ tiers</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              {
                name: 'BlitzIQ Pro: Elite Sideline',
                short: 'Elite',
                tagline: 'One Elite program per region, per season.',
                bullets: [
                  'Region-exclusive engagement for the season.',
                  'Full BlitzIQ Pro engine, white-glove onboarding, deeper support.',
                ],
                bestFor: 'Varsity staffs who want a Pro™ected edge on every region opponent.',
                pricingLine:
                  'Region-exclusive; typically about 2× Standard pricing plus a one-time setup fee. Single-digit-thousand line item for the year.',
                pricingLine:
                  'Region-exclusive; typically about 2× Standard pricing plus a one-time setup fee. Single-digit-thousand line item for the year.',
                plan: 'Elite' as Plan,
              },
              {
                name: 'BlitzIQ Pro: Standard',
                short: 'Standard',
                tagline: 'Full BlitzIQ Pro engine for most varsity staffs.',
                bullets: [
                  'Founders: $99 now, then $199/mo for 12 months. Access in March.',
                  'Standard launch: $249/mo for 12 months starting with June access.',
                  '1-year contract. 10% off subscription if paid annually (not on the $99).',
                ],
                bestFor: 'Varsity programs ready to bring analytics to the box and sideline.',
                pricingLine: 'No free trials. Monthly or annual (10% off subscription if prepaid).',
                ctaLabel: 'Get Standard details',
                plan: 'Standard' as Plan,
                featured: false,
              },
            ].map((plan) => (
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
                {plan.pricingLine && (
                  <p className="text-xs text-slate-400">{plan.pricingLine}</p>
                )}
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Best for: {plan.bestFor}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setIntentAndScroll(plan.plan === 'Elite' ? 'elite_availability' : 'demo_deck', plan.plan)
                  }
                  className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] focus:outline-none focus:ring-2 ${
                    plan.featured
                      ? 'bg-brand text-black hover:bg-brand-soft focus:ring-brand/60'
                      : 'border border-slate-700 text-slate-200 hover:border-brand hover:text-brand focus:ring-brand/40'
                  }`}
                >
                  {plan.ctaLabel}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-slate-800 bg-black/20 p-5 space-y-3">
          <h3 className="text-xl font-semibold text-slate-50">
            What â€œone Elite program per regionâ€ means
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            If your staff signs BlitzIQ Pro: Elite Sideline, we do not sign another Elite school in your
            region for that season. Standard remains available in the region; exclusivity applies
            only to Elite. Renew by the agreed date and you keep the Elite spot for the next season.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIntentAndScroll('elite_availability', 'Elite')}
              className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black focus:outline-none focus:ring-2 focus:ring-brand/60 hover:bg-brand-soft"
            >
              Check Elite availability in your region
            </button>
            <button
              type="button"
              onClick={() => setIntentAndScroll('demo_deck', 'Standard')}
              className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              Get the demo deck & playbook
            </button>
          </div>
        </section>

        <section
          id="billing"
          className="mt-14 rounded-2xl border border-slate-800 bg-black/20 p-5 space-y-2 text-sm text-slate-200"
        >
          <h3 className="text-lg font-semibold text-slate-50">How billing works</h3>
          <p>All plans are 1-year contracts.</p>
          <p>Pay monthly, or pay the year up front and get 10% off the subscription (not the $99 Founders payment).</p>
          <p>Founders (Standard): $99 now, then $199/mo for 12 months; access starts in March.</p>
          <p>Standard launch: $249/mo for 12 months if you start at June launch or later.</p>
          <p>No free trials.</p>
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
              <button
                type="button"
                onClick={() => setIntentAndScroll('demo_deck', 'Standard')}
                className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-black focus:outline-none focus:ring-2 focus:ring-brand/60"
              >
                Get the demo deck & film breakdown sample
              </button>
              <button
                type="button"
                onClick={() => setIntentAndScroll('demo_deck', 'Standard')}
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                Watch the 3-minute sideline walkthrough
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Prefer a call? Request one and weâ€™ll schedule based on staff capacity.
            </p>
          </div>
        </section>

        <section id="contact" className="mt-16 rounded-2xl border border-slate-800 bg-black/25 p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Check Elite availability</h2>
          <p className="text-sm text-slate-300">
            No free trials or calendar spam. Share the basics and weâ€™ll confirm Elite slots or send the deck
            and walkthrough for Standard.
          </p>
          {successIntent && (
            <div
              className="md:col-span-2 rounded-xl border border-emerald-600/40 bg-emerald-500/10 p-3 text-sm text-emerald-100"
              role="status"
              aria-live="polite"
            >
              {successCopy[successIntent]}
            </div>
          )}
          {error && (
            <div
              id="contact-error"
              className="md:col-span-2 rounded-xl border border-red-600/40 bg-red-500/10 p-3 text-sm text-red-100"
              role="alert"
            >
              {error}
            </div>
          )}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
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
                  aria-required={field.required}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'contact-error' : undefined}
                  className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                />
              </label>
            ))}
            <label className="space-y-1 text-xs text-slate-400 md:col-span-2">
              <span className="uppercase tracking-[0.2em]">Plan of interest</span>
              <select
                name="plan"
                value={selectedPlan}
                onChange={(e) => {
                  const next = e.target.value as Plan
                  planRef.current = next
                  setSelectedPlan(next)
                }}
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
              >
                <option value="Elite">Elite</option>
                <option value="Standard">Standard</option>
              </select>
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button
                type="submit"
                onClick={() => {
                  intentRef.current = 'elite_availability'
                  planRef.current = 'Elite'
                  setSelectedPlan('Elite')
                }}
                disabled={submitting}
                className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
              >
                {submitting && intentRef.current === 'elite_availability'
                  ? 'Sending...'
                  : 'Check availability'}
              </button>
              <button
                type="submit"
                onClick={() => {
                  intentRef.current = 'demo_deck'
                }}
                disabled={submitting}
                className="rounded-full border border-slate-700 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
              >
                {submitting && intentRef.current === 'demo_deck'
                  ? 'Sending...'
                  : 'Get the demo deck & playbook'}
              </button>
              <button
                type="submit"
                onClick={() => {
                  intentRef.current = 'call_request'
                }}
                disabled={submitting}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand/30 rounded-full px-3"
              >
                {submitting && intentRef.current === 'call_request'
                  ? 'Sending...'
                  : 'Request a call with our team'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <footer className="border-t border-slate-900/60 bg-black/70">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="text-center md:text-left">
            <p>© {new Date().getFullYear()} BlitzIQ Pro. All rights reserved.</p>
            <p className="text-xs text-slate-500">A product of Trips Right, LLC.</p>
          </div>
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em]">
            <Link href="#" className="hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 rounded-full px-2 py-1">
              Privacy
            </Link>
            <Link href="#" className="hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 rounded-full px-2 py-1">
              Terms
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 rounded-full px-2 py-1"
            >
              Contact
            </button>
          </div>
        </div>
      </footer>
    </main>
  )
}











