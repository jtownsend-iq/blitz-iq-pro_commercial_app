'use client'

import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  Flame,
  Radar,
  Rocket,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { GlassCard } from '@/components/ui/GlassCard'
import { Pill } from '@/components/ui/Pill'
import { StatBadge } from '@/components/ui/StatBadge'
import { MotionList } from '@/components/ui/MotionList'

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
  { label: 'Name', name: 'name', type: 'text', required: true, autoComplete: 'name', description: 'Full name for follow-up.' },
  {
    label: 'Command Post',
    name: 'role',
    type: 'select',
    required: true,
    autoComplete: 'organization-title',
    description: 'Your current post (HC, OC, DC, Analyst, AD, etc.).',
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
  { label: 'School', name: 'school', type: 'text', required: true, autoComplete: 'organization', description: 'Program or school name.' },
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
    ],
  },
  {
    label: 'Classification',
    name: 'classification',
    type: 'select',
    required: true,
    autoComplete: 'organization-title',
    description: 'Level (HS, JUCO, NAIA, FBS, CFL, etc.).',
    options: [
      { label: 'High School', value: 'High School' },
      { label: 'College FBS', value: 'College FBS' },
      { label: 'College FCS', value: 'College FCS' },
      { label: 'College D2/D3/NAIA', value: 'College D2/D3/NAIA' },
      { label: 'JUCO', value: 'JUCO' },
      { label: 'CFL / U Sports', value: 'CFL / U Sports' },
      { label: 'Other', value: 'Other' },
    ],
  },
  { label: 'Region', name: 'region', type: 'text', required: true, description: 'Metro/area coverage.', autoComplete: 'address-level2' },
  { label: 'Work Email', name: 'email', type: 'email', required: true, autoComplete: 'email', description: 'We never share your email.' },
]

const outcomes = [
  { title: 'Series clarity', description: 'Explosives and success mapped to opponent tendencies.', icon: <Radar className="h-5 w-5 text-cyan-200" /> },
  { title: 'Cutups on demand', description: 'AI-tagged filters ready mid-game for booth and sideline.', icon: <Zap className="h-5 w-5 text-amber-200" /> },
  { title: 'Staff lockstep', description: 'Command, booth, and field share one live feed.', icon: <Shield className="h-5 w-5 text-emerald-200" /> },
]

const capabilities = [
  { title: 'One live source', copy: 'Offense, defense, and special teams stay in one truth set.', icon: <Flame className="h-5 w-5 text-amber-300" /> },
  { title: 'Playbook vision', copy: 'Formations and personnel tied to outcomes, pace, and explosives.', icon: <Trophy className="h-5 w-5 text-cyan-300" /> },
  { title: 'Call sheet ready', copy: 'Auto summaries for thirds, red zone, and explosives by hash.', icon: <BadgeCheck className="h-5 w-5 text-emerald-300" /> },
]

const plans = [
  {
    name: 'Elite',
    price: 'Custom',
    summary: 'Full stack with white-glove onboarding, live support, and AI speed.',
    highlights: ['Unlimited games & sessions', 'AI tagging + live charts', 'Dedicated analyst concierge'],
  },
  {
    name: 'Standard',
    price: '$299/mo',
    summary: 'Live charting and scouting essentials for fast-moving staffs.',
    highlights: ['Live charting for all units', 'Scouting imports & cutups', 'Staff access with controls'],
  },
]

const securityPoints = [
  'Dedicated Supabase project with row-level policies',
  'Audit trails on exports and API keys',
  'TLS everywhere with least-privilege roles',
  'Backed by Trips Right, LLC (US-based)',
]

const pulseVariants = {
  animate: {
    scale: [1, 1.08, 1],
    opacity: [0.4, 0.8, 0.4],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

export default function MarketingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('Elite')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successIntent, setSuccessIntent] = useState<Intent | null>(null)
  const [invalidField, setInvalidField] = useState<ContactFieldName | null>(null)

  const intentRef = useRef<Intent>('elite_availability')
  const planRef = useRef<Plan>('Elite')
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const copyrightSymbol = '\u00A9'

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
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
      elite_availability: 'We will confirm Elite availability in your region and follow up by email.',
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
        if (!res.ok) throw new Error(json?.error || 'Failed to send your info.')
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
    <main className="bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.1),transparent_30%),#020617] text-slate-50 min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-2xl shadow-[0_30px_120px_-70px_rgba(0,0,0,0.9)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-brand to-transparent opacity-60" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative h-[2.75rem] w-[4.5rem] overflow-hidden">
              <Image src="/blitziq-logo.png" alt="BlitzIQ Pro logo" fill className="object-contain drop-shadow-[0_8px_24px_rgba(0,229,255,0.35)]" priority />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-slate-50">BlitzIQ Pro™</div>
              <div className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-soft">
                Command every snap.
              </div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-300">
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
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:border-brand hover:text-white hover:bg-brand/10 transition"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-brand hover:text-white transition"
            >
              Login
            </Link>
            <button
              type="button"
              onClick={() => setIntentAndScroll('elite_availability', 'Elite')}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
            >
              Check Elite availability <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
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
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 hover:border-brand hover:text-white hover:bg-brand/10 transition"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-14">
        <SectionHeader
          eyebrow="Live Game-Day Operating System"
          title="Command every snap with BlitzIQ Pro"
          description="Elite staffs keep booth, sideline, and command post aligned on one live surface."
          badge="Command Center"
          actions={
            <div className="flex flex-wrap gap-2">
              <Pill label="Live charting" tone="emerald" icon={<Sparkles className="h-3.5 w-3.5" />} />
              <Pill label="Scouting OS" tone="cyan" icon={<Radar className="h-3.5 w-3.5" />} />
            </div>
          }
        />

        <GlassCard className="grid gap-6 md:grid-cols-[1.1fr,0.9fr] items-center">
          <div className="space-y-4">
            <p className="text-lg text-slate-200">Built for staffs that need clarity under pressure.</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBadge label="Explosive IDs" value="Live" tone="cyan" />
              <StatBadge label="Call Sheet Sync" value="Real-time" tone="emerald" />
              <StatBadge label="Deployments" value="500+ games" tone="amber" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setIntentAndScroll('demo_deck', selectedPlan)}
                className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft"
              >
                Get the demo deck
              </button>
              <button
                type="button"
                onClick={() => setIntentAndScroll('call_request', selectedPlan)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-white"
              >
                Talk to a coach
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <Pill label="No student logins" tone="slate" icon={<Shield className="h-3 w-3" />} />
              <Pill label="Multi-tenant" tone="cyan" icon={<Fingerprint className="h-3 w-3" />} />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-black/60 p-6 shadow-[0_25px_90px_-50px_rgba(0,0,0,0.8)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.16),transparent_40%)]" />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Pill label="Live Ops" tone="emerald" />
                <Pill label="AI Assist" tone="cyan" />
              </div>
              <div className="relative h-32 rounded-2xl border border-white/10 bg-slate-950/60 overflow-hidden">
                <motion.div
                  className="absolute inset-6 rounded-full bg-cyan-500/20 blur-3xl"
                  variants={pulseVariants}
                  animate="animate"
                />
                <motion.div
                  className="absolute inset-y-6 left-6 right-1/3 rounded-full bg-emerald-500/10 blur-2xl"
                  variants={pulseVariants}
                  animate="animate"
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                />
                <div className="absolute inset-0 grid grid-cols-6 gap-2 opacity-40">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <span key={idx} className="h-full w-px bg-gradient-to-b from-transparent via-white/40 to-transparent mx-auto" />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-200">
                  <Sparkles className="h-4 w-4 text-brand" />
                  Live call sheet sync
                  <Sparkles className="h-4 w-4 text-brand" />
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-slate-100">Explosive Probability</p>
                <p className="text-xs text-slate-400">By hash, motion, personnel, and front.</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                  <GlassCard padding="md" className="text-center" tone="cyan">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/70">Left Hash</p>
                    <p className="text-xl font-semibold text-white tabular-nums">18%</p>
                  </GlassCard>
                  <GlassCard padding="md" className="text-center" tone="emerald">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/70">Middle</p>
                    <p className="text-xl font-semibold text-white tabular-nums">11%</p>
                  </GlassCard>
                  <GlassCard padding="md" className="text-center" tone="amber">
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/70">Right Hash</p>
                    <p className="text-xl font-semibold text-white tabular-nums">22%</p>
                  </GlassCard>
                </div>
              </div>
              <GlassCard padding="md" className="flex items-center justify-between" tone="neutral">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Velocity</p>
                  <p className="text-base font-semibold text-slate-50">2.4x faster decisions</p>
                </div>
                <Rocket className="h-6 w-6 text-brand" />
              </GlassCard>
            </div>
          </div>
        </GlassCard>

        <section id="outcomes" className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill label="Outcomes" tone="emerald" icon={<Trophy className="h-4 w-4" />} />
            <p className="text-sm text-slate-400">What staffs report after deploying BlitzIQ Pro.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {outcomes.map((item) => (
              <GlassCard key={item.title} padding="md" interactive>
                <div className="flex items-center gap-3">
                  {item.icon}
                  <h3 className="text-lg font-semibold text-slate-50">{item.title}</h3>
                </div>
                <p className="mt-2 text-sm text-slate-400">{item.description}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        <section id="capabilities" className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill label="Capabilities" tone="cyan" icon={<Sparkles className="h-4 w-4" />} />
            <p className="text-sm text-slate-400">Command Center-grade tools for game day and scouting.</p>
          </div>
          <MotionList
            items={capabilities}
            getKey={(c) => c.title}
            renderItem={(cap) => (
              <GlassCard padding="md" interactive>
                <div className="flex items-center gap-3">
                  {cap.icon}
                  <h3 className="text-lg font-semibold text-slate-50">{cap.title}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-400">{cap.copy}</p>
              </GlassCard>
            )}
          />
        </section>

        <section id="plans" className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill label="Plans" tone="slate" icon={<BadgeCheck className="h-4 w-4" />} />
            <p className="text-sm text-slate-400">Choose Elite for white-glove or Standard for streamlined rollout.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <GlassCard key={plan.name} padding="md" interactive className={selectedPlan === plan.name ? 'border-brand/60' : ''}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{plan.name}</p>
                    <h3 className="text-2xl font-semibold text-slate-50">{plan.price}</h3>
                  </div>
                  <Pill label="Live" tone="emerald" />
                </div>
                <p className="mt-2 text-sm text-slate-300">{plan.summary}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-300" />
                      {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIntentAndScroll('elite_availability', plan.name as Plan)}
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft"
                  >
                    {plan.name === 'Elite' ? 'Check availability' : 'Start Standard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntentAndScroll('demo_deck', plan.name as Plan)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-white"
                  >
                    Demo deck
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        <section id="security" className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill label="Security" tone="emerald" icon={<Fingerprint className="h-4 w-4" />} />
            <p className="text-sm text-slate-400">Multi-tenant, policy-driven access with full auditability.</p>
          </div>
          <GlassCard>
            <div className="grid gap-3 md:grid-cols-2">
              {securityPoints.map((point) => (
                <div key={point} className="flex items-center gap-3 text-sm text-slate-200">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  {point}
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        <section id="contact" className="space-y-4">
          <SectionHeader
            eyebrow="Contact"
            title="Set your staff up in minutes"
            description="Tell us your role, classification, and goal. We respond fast during in-season."
            badge="White glove"
          />
          <GlassCard>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
              {contactFields.map((field) => (
                <label key={field.name} className="space-y-1 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.2em] text-slate-300">{field.label}</span>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      required={field.required}
                      aria-label={field.label}
                      autoComplete={field.autoComplete}
                      className={`w-full rounded-xl border ${invalidField === field.name ? 'border-amber-500' : 'border-white/10'} bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30`}
                    >
                      <option value="">Select</option>
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
                      aria-label={field.label}
                      autoComplete={field.autoComplete}
                      className={`w-full rounded-xl border ${invalidField === field.name ? 'border-amber-500' : 'border-white/10'} bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30`}
                    />
                  )}
                  <span className="block text-[0.7rem] text-slate-500">{field.description}</span>
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
                  aria-label="Select your plan of interest"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/30"
                >
                  <option value="Elite">Elite</option>
                  <option value="Standard">Standard</option>
                </select>
                <span className="block text-[0.7rem] text-slate-500">
                  {selectedPlan === 'Elite'
                    ? 'Elite unlocks AI velocity, concierge analyst, and premium support.'
                    : 'Standard includes core live charting, scouting imports, and staff controls.'}
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
                className="rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60 disabled:opacity-60"
              >
                  {submitting && intentRef.current === 'elite_availability' ? 'Sending...' : 'Check availability'}
                </button>
                <button
                  type="submit"
                onClick={() => {
                  intentRef.current = 'demo_deck'
                }}
                disabled={submitting}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
              >
                  {submitting && intentRef.current === 'demo_deck' ? 'Sending...' : 'Get the demo deck'}
                </button>
                <button
                  type="submit"
                onClick={() => {
                  intentRef.current = 'call_request'
                }}
                disabled={submitting}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
              >
                  {submitting && intentRef.current === 'call_request' ? 'Sending...' : 'Request a call'}
                </button>
              </div>
              {error ? (
                <div className="md:col-span-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {error}
                </div>
              ) : null}
              {successIntent ? (
                <div className="md:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {successCopy[successIntent]}
                </div>
              ) : null}
            </form>
          </GlassCard>
        </section>
      </div>

      <footer className="border-t border-white/10 bg-black/70" aria-label="BlitzIQ Pro marketing footer">
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
