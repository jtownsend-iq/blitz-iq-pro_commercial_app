'use client'

import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Plan = 'Elite' | 'Standard'
type Intent = 'elite_availability' | 'demo_deck' | 'call_request'
type FieldType = 'text' | 'email' | 'select'
type ContactFieldName =
  | 'name'
  | 'role'
  | 'school'
  | 'state'
  | 'classification'
  | 'region'
  | 'email'

type ContactField = {
  label: string
  name: ContactFieldName
  type: FieldType
  description: string
  required?: boolean
  autoComplete?: string
  options?: { label: string; value: string }[]
}

const contactFields: ContactField[] = [
  {
    label: 'Name',
    name: 'name',
    type: 'text',
    required: true,
    autoComplete: 'name',
    description: 'Full name so we know who to follow up with.',
  },
  {
    label: 'Role',
    name: 'role',
    type: 'select',
    required: true,
    autoComplete: 'organization-title',
    description: 'Your current role (HC, OC, DC, Analyst, AD, etc.).',
    options: [
      { label: 'Head Coach', value: 'Head Coach' },
      { label: 'Offensive Coordinator', value: 'Offensive Coordinator' },
      { label: 'Defensive Coordinator', value: 'Defensive Coordinator' },
      { label: 'Special Teams Coordinator', value: 'Special Teams Coordinator' },
      { label: 'Analyst', value: 'Analyst' },
      { label: 'Quality Control', value: 'Quality Control' },
      { label: 'Assistant Coach', value: 'Assistant Coach' },
      { label: 'Other Coach', value: 'Other Coach' },
    ],
  },
  {
    label: 'School',
    name: 'school',
    type: 'text',
    required: true,
    autoComplete: 'organization',
    description: 'Program or school name to align regional coverage.',
  },
  {
    label: 'State',
    name: 'state',
    type: 'select',
    required: true,
    autoComplete: 'address-level1',
    description: 'State or province (e.g., TX, CA, ON).',
    options: [
      { label: 'Alabama', value: 'AL' },
      { label: 'Alaska', value: 'AK' },
      { label: 'Arizona', value: 'AZ' },
      { label: 'Arkansas', value: 'AR' },
      { label: 'California', value: 'CA' },
      { label: 'Colorado', value: 'CO' },
      { label: 'Connecticut', value: 'CT' },
      { label: 'Delaware', value: 'DE' },
      { label: 'District of Columbia', value: 'DC' },
      { label: 'Florida', value: 'FL' },
      { label: 'Georgia', value: 'GA' },
      { label: 'Hawaii', value: 'HI' },
      { label: 'Idaho', value: 'ID' },
      { label: 'Illinois', value: 'IL' },
      { label: 'Indiana', value: 'IN' },
      { label: 'Iowa', value: 'IA' },
      { label: 'Kansas', value: 'KS' },
      { label: 'Kentucky', value: 'KY' },
      { label: 'Louisiana', value: 'LA' },
      { label: 'Maine', value: 'ME' },
      { label: 'Maryland', value: 'MD' },
      { label: 'Massachusetts', value: 'MA' },
      { label: 'Michigan', value: 'MI' },
      { label: 'Minnesota', value: 'MN' },
      { label: 'Mississippi', value: 'MS' },
      { label: 'Missouri', value: 'MO' },
      { label: 'Montana', value: 'MT' },
      { label: 'Nebraska', value: 'NE' },
      { label: 'Nevada', value: 'NV' },
      { label: 'New Hampshire', value: 'NH' },
      { label: 'New Jersey', value: 'NJ' },
      { label: 'New Mexico', value: 'NM' },
      { label: 'New York', value: 'NY' },
      { label: 'North Carolina', value: 'NC' },
      { label: 'North Dakota', value: 'ND' },
      { label: 'Ohio', value: 'OH' },
      { label: 'Oklahoma', value: 'OK' },
      { label: 'Oregon', value: 'OR' },
      { label: 'Pennsylvania', value: 'PA' },
      { label: 'Rhode Island', value: 'RI' },
      { label: 'South Carolina', value: 'SC' },
      { label: 'South Dakota', value: 'SD' },
      { label: 'Tennessee', value: 'TN' },
      { label: 'Texas', value: 'TX' },
      { label: 'Utah', value: 'UT' },
      { label: 'Vermont', value: 'VT' },
      { label: 'Virginia', value: 'VA' },
      { label: 'Washington', value: 'WA' },
      { label: 'West Virginia', value: 'WV' },
      { label: 'Wisconsin', value: 'WI' },
      { label: 'Wyoming', value: 'WY' },
      { label: 'Ontario', value: 'ON' },
      { label: 'Quebec', value: 'QC' },
      { label: 'British Columbia', value: 'BC' },
      { label: 'Alberta', value: 'AB' },
      { label: 'Saskatchewan', value: 'SK' },
      { label: 'Manitoba', value: 'MB' },
      { label: 'Other', value: 'Other' },
    ],
  },
  {
    label: 'Classification',
    name: 'classification',
    type: 'select',
    required: true,
    description: 'Division or class (e.g., 6A, FCS, D2).',
    options: [
      { label: '6A', value: '6A' },
      { label: '5A', value: '5A' },
      { label: '4A', value: '4A' },
      { label: '3A', value: '3A' },
      { label: '2A', value: '2A' },
      { label: '1A/Private', value: '1A/Private' },
      { label: 'Independent', value: 'Independent' },
      { label: 'College - FBS', value: 'College - FBS' },
      { label: 'College - FCS', value: 'College - FCS' },
      { label: 'College - D2', value: 'College - D2' },
      { label: 'College - D3', value: 'College - D3' },
      { label: 'College - JuCo', value: 'College - JuCo' },
      { label: 'Other/International', value: 'Other/International' },
    ],
  },
  {
    label: 'Region',
    name: 'region',
    type: 'text',
    required: true,
    description: 'Region or district so we can verify Elite exclusivity.',
  },
  {
    label: 'Email',
    name: 'email',
    type: 'email',
    required: true,
    autoComplete: 'email',
    description: 'Work email for the deck, breakdown, and confirmations.',
  },
]

const planFieldDescription =
  'Pick Elite to check exclusivity in your region or Standard to get the deck and walkthrough.'

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('Elite')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successIntent, setSuccessIntent] = useState<Intent | null>(null)
  const [invalidField, setInvalidField] = useState<ContactFieldName | null>(null)
  const intentRef = useRef<Intent>('demo_deck')
  const planRef = useRef<Plan>('Elite')
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const copyrightSymbol = '\u00A9'

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
        'We have your info. We will confirm Elite availability in your region and follow up by email.',
      demo_deck: 'We will send the demo deck and sample breakdown so you can see how it fits your staff.',
      call_request: 'We will follow up to schedule a call based on your availability.',
    }),
    []
  )

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setSubmitting(true)
      setError(null)
      setSuccessIntent(null)
      setInvalidField(null)

      const form = event.currentTarget
      const formData = new FormData(form)
      const cleanedValues = contactFields.reduce(
        (acc, field) => {
          acc[field.name] = String(formData.get(field.name) || '').trim()
          return acc
        },
        {} as Record<ContactFieldName, string>
      )

      for (const field of contactFields) {
        if (!field.required) continue
        const value = cleanedValues[field.name]
        if (!value) {
          const message = `${field.label} is required.`
          setError(message)
          setInvalidField(field.name)
          const target = form.elements.namedItem(field.name) as HTMLElement | null
          target?.focus()
          setSubmitting(false)
          return
        }
      }

      if (cleanedValues.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanedValues.email)) {
        setError('Enter a valid work email address.')
        setInvalidField('email')
        const target = form.elements.namedItem('email') as HTMLElement | null
        target?.focus()
        setSubmitting(false)
        return
      }

      const payload = {
        name: cleanedValues.name,
        role: cleanedValues.role,
        school: cleanedValues.school,
        state: cleanedValues.state,
        classification: cleanedValues.classification,
        region: cleanedValues.region,
        email: cleanedValues.email,
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
        setInvalidField(null)
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
              { label: 'Exclusivity', id: 'exclusivity' },
              { label: 'Security', id: 'security' },
              { label: 'Contact', id: 'contact' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-full px-3 py-2 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 min-h-[40px]"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={() => setIntentAndScroll('elite_availability', 'Elite')}
              className="rounded-full bg-brand px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
            >
              Check Elite availability
            </button>
          </div>
        </div>
        <div className="md:hidden border-t border-slate-900/60 bg-black/80">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto text-[0.7rem] uppercase tracking-[0.18em] text-slate-300">
            {[
              { label: 'Outcomes', id: 'outcomes' },
              { label: 'Capabilities', id: 'capabilities' },
              { label: 'Plans', id: 'plans' },
              { label: 'Exclusivity', id: 'exclusivity' },
              { label: 'Security', id: 'security' },
              { label: 'Contact', id: 'contact' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-full px-3 py-2 bg-slate-900/60 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 whitespace-nowrap min-h-[40px]"
              >
                {item.label}
              </button>
            ))}
            <Link
              href="/login"
              className="rounded-full px-3 py-2 bg-slate-900/60 text-slate-200 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/40 whitespace-nowrap min-h-[40px]"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-14 lg:py-18">
        <section
          id="hero"
          className="grid gap-10 md:gap-14 md:grid-cols-[1.2fr_minmax(0,1fr)] items-start"
        >
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
                Analyst in the box tags each snap in ~10 seconds and feeds the sideline before money downs.
                See next-call odds before they break the huddle, and keep the staff aligned from Friday
                through Tuesday install. Elite Sideline is one per region; Standard covers everyone else.
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
                <span>Tag every snap in ~10 seconds from the box; no re-entering data on Sunday.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>See next-call probabilities and stress-beaters before the opponent adjusts.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand" />
                <span>Run game plans, season trends, and player notes from one place across the staff.</span>
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
          <h2 className="text-2xl font-semibold text-slate-50">Decide before the huddle</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              'Tag every snap from the box in about 10 seconds; sideline gets answers before 3rd-and-6.',
              'Save 4-6 hours of Sunday breakdown per game; walk into Monday ahead.',
              'Give the staff the same picture before Tuesday install.',
              'Sideline gets call probabilities in time to adjust personnel and stress-beaters.',
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
          <h2 className="text-2xl font-semibold text-slate-50">BlitzIQ Pro™ tiers built for football</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              {
                name: 'BlitzIQ Pro: Elite Sideline',
                short: 'Elite',
                tagline: 'Region-exclusive sideline + scouting for the season.',
                bullets: [
                  'Region-exclusive engagement for your season.',
                  'Full BlitzIQ Pro engine with sideline and scouting; white-glove onboarding and weekly support.',
                ],
                bestFor: 'Varsity staffs that want a protected edge on every region opponent.',
                pricingLine:
                  'Region-exclusive; typically about 2x Standard pricing plus a one-time setup fee. Single-digit-thousand line item for the year.',
                plan: 'Elite' as Plan,
                ctaLabel: 'Check Elite availability',
                featured: true,
                badgeLabel: 'Region Exclusive',
              },
              {
                name: 'BlitzIQ Pro: Standard',
                short: 'Standard',
                tagline: 'Full BlitzIQ Pro engine for most varsity staffs.',
                bullets: [
                  'Founders: $99 now, then $199/mo for 12 months. March access.',
                  'Standard launch: $249/mo for 12 months starting with June access.',
                  '1-year contract. 10% off subscription if prepaid (not on the $99).',
                ],
                bestFor: 'Varsity programs ready to bring analytics to the box and sideline.',
                pricingLine: 'No free trials. Monthly or annual with 10% subscription savings when prepaid.',
                ctaLabel: 'Get Standard details',
                plan: 'Standard' as Plan,
                featured: false,
                badgeLabel: 'Founders',
                badgeTone: 'muted',
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
                  {plan.badgeLabel ? (
                    <span
                      className={`rounded-full text-[0.65rem] px-3 py-1 border ${
                        plan.badgeTone === 'muted'
                          ? 'bg-slate-900/60 text-slate-200 border-slate-700'
                          : 'bg-brand/15 text-brand border-brand/50'
                      }`}
                    >
                      {plan.badgeLabel}
                    </span>
                  ) : null}
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

        <section
          id="billing"
          className="mt-10 rounded-2xl border border-slate-800 bg-black/20 p-5 space-y-2 text-sm text-slate-200"
        >
          <h3 className="text-lg font-semibold text-slate-50">How billing works</h3>
          <p>All plans are 1-year contracts.</p>
          <p>Pay monthly, or pay the year up front and get 10% off the subscription (not the $99 Founders payment).</p>
          <p>Founders (Standard): $99 now, then $199/mo for 12 months; access starts in March.</p>
          <p>Standard launch: $249/mo for 12 months if you start at June launch or later.</p>
          <p>No free trials.</p>
        </section>

        <section
          id="exclusivity"
          className="mt-14 rounded-2xl border border-slate-800 bg-black/20 p-5 space-y-3"
        >
          <h3 className="text-xl font-semibold text-slate-50">
            What &ldquo;one Elite program per region&rdquo; means
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            If your staff signs BlitzIQ Pro: Elite Sideline, we will not sign another Elite school in your
            region this season. Standard remains available; exclusivity applies only to Elite. Renew by the
            agreed date to keep the Elite spot for next season.
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

        <section id="security" className="mt-16 grid gap-6 lg:grid-cols-[1.1fr_minmax(0,1fr)] items-start">
          <div className="space-y-3">
            <p className="text-[0.75rem] uppercase tracking-[0.22em] text-slate-500">
              Security, trust, and multi-tenant control
            </p>
            <h2 className="text-2xl font-semibold text-slate-50">Built for HC/OC/DC/ST/Analyst</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tenant isolation with RLS, role-based access for HC/OC/DC/ST/Analyst, audited actions,
              backup/export paths, and SSO/SAML on deck. Uptime SLAs and support match your season calendar.
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
              <p>Skip the call. Grab the demo deck, sample film breakdown, and a 3-minute sideline walkthrough.</p>
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
              Prefer a call? Request one and we&apos;ll schedule based on staff capacity.
            </p>
          </div>
        </section>

        <section id="contact" className="mt-16 rounded-2xl border border-slate-800 bg-black/25 p-6 space-y-4">
          <h2 className="text-2xl font-semibold text-slate-50">Check Elite availability</h2>
          <p className="text-sm text-slate-300">
            No free trials or calendar spam. Share the basics and we&apos;ll confirm Elite slots or send the deck
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
              aria-live="assertive"
            >
              {error}
            </div>
          )}
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
            {contactFields.map((field) => {
              const descriptionId = `contact-${field.name}-description`
              const hasFieldError = invalidField === field.name && Boolean(error)
              const describedBy = [descriptionId, hasFieldError ? 'contact-error' : null]
                .filter(Boolean)
                .join(' ') || undefined
              const inputClasses = [
                'w-full rounded-lg border bg-black/40 px-3 py-2 text-sm text-slate-100 focus:ring-2 transition-colors min-h-[44px]',
                hasFieldError
                  ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'
                  : 'border-slate-800 focus:border-brand focus:ring-brand/30',
              ].join(' ')

              return (
                <label key={field.name} className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em]">{field.label}</span>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      required={field.required}
                      aria-required={field.required}
                      aria-invalid={hasFieldError}
                      aria-errormessage={hasFieldError ? 'contact-error' : undefined}
                      aria-describedby={describedBy}
                      className={inputClasses}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select {field.label.toLowerCase()}
                      </option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      required={field.required}
                      aria-required={field.required}
                      aria-invalid={hasFieldError}
                      aria-errormessage={hasFieldError ? 'contact-error' : undefined}
                      aria-describedby={describedBy}
                      autoComplete={field.autoComplete}
                      className={inputClasses}
                    />
                  )}
                  <span id={descriptionId} className="block text-[0.7rem] text-slate-500">
                    {field.description}
                  </span>
                </label>
              )
            })}
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
                aria-describedby="contact-plan-description"
                aria-label="Select your plan of interest"
                className="w-full rounded-lg border border-slate-800 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30 transition-colors"
              >
                <option value="Elite">Elite</option>
                <option value="Standard">Standard</option>
              </select>
              <span id="contact-plan-description" className="block text-[0.7rem] text-slate-500">
                {planFieldDescription}
              </span>
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

      <footer className="border-t border-slate-900/60 bg-black/70" aria-label="BlitzIQ Pro marketing footer">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <div className="text-center md:text-left">
            <p aria-label={`Copyright ${currentYear} BlitzIQ Pro`}>
              {copyrightSymbol} {currentYear} BlitzIQ Pro. All rights reserved.
            </p>
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











