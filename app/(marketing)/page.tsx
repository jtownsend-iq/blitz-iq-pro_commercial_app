'use client'

import { useCallback, useMemo, type ReactNode } from 'react'
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

type Outcome = { title: string; description: string; icon: ReactNode }
type Capability = { title: string; copy: string; icon: ReactNode }
type PlanCard = {
  name: Plan
  price: string
  summary: string
  highlights: string[]
}

const outcomes: Outcome[] = [
  { title: 'Own 3rd-and-medium', description: 'See their go-to calls by formation, hash, and personnel before you dial it.', icon: <Radar className="h-5 w-5 text-cyan-200" /> },
  { title: 'Instant cutups', description: 'Filter by formation, hash, motion, and front in seconds-booth and sideline stay aligned.', icon: <Zap className="h-5 w-5 text-amber-200" /> },
  { title: 'Staff in sync', description: 'Booth, sideline, and call sheet share one live scouting feed.', icon: <Shield className="h-5 w-5 text-emerald-200" /> },
]

const capabilities: Capability[] = [
  { title: 'One place for O/D/ST', copy: 'Offense, defense, and special teams share synced charting and scouting.', icon: <Flame className="h-5 w-5 text-amber-300" /> },
  { title: 'Call sheet fuel', copy: 'Top formations, personnel, motions, and fronts tied to explosives and success.', icon: <Trophy className="h-5 w-5 text-cyan-300" /> },
  { title: 'Situational speed', copy: 'Fast filters for thirds, red zone, pressure, and specials by hash and down.', icon: <BadgeCheck className="h-5 w-5 text-emerald-300" /> },
]

const plans: PlanCard[] = [
  {
    name: 'Elite',
    price: 'Custom',
    summary: 'Custom setup with live charting, AI breakdowns, scouting imports, and white-glove support.',
    highlights: [
      'Live charting for offense/defense/special teams',
      'Scouting CSV imports and AI-powered breakdowns',
      'Pre-game reports and post-game exports',
      'White-glove onboarding and game-night support',
    ],
  },
  {
    name: 'Standard',
    price: 'Starts at $299/mo',
    summary: 'Live charting and scouting for most staffs with simple rollout.',
    highlights: [
      'Live charting for O/D/ST with staff roles',
      'Scouting CSV imports and instant cutups',
      'Call sheet-ready reports by down/dist',
      'Secure access controls and audit trails',
    ],
  },
]

const securityPoints: string[] = [
  'Multi-tenant security with row-level access controls',
  'Audit logs on staff activity and exports',
  'Encrypted in transit and at rest',
  'Operated by Trips Right, LLC (US-based)',
]

const pulseVariants = {
  animate: {
    scale: [1, 1.08, 1],
    opacity: [0.4, 0.8, 0.4],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

export default function MarketingPage() {
  const selectedPlan: Plan = 'Elite'
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const copyrightSymbol = '\u00A9'

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

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
              <div className="text-sm font-semibold tracking-wide text-slate-50">BlitzIQ Pro</div>
              <div className="text-[0.7rem] uppercase tracking-[0.16em] text-brand-soft">
                Engineered to Destroy Egos.
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
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft focus:outline-none focus:ring-2 focus:ring-brand/60"
            >
              Start membership <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
          eyebrow="Chart your calls, break down scouting, and get fast answers on game night."
          title="Make the call everyone else wishes they had"
          description="Built for coaches who need the right call, the right cutup, and the right report without slowing down."
          badge="Starting at $299/mo"
          actions={
            <div className="flex flex-wrap gap-2">
              <Pill label="Live charting" tone="emerald" icon={<Sparkles className="h-3.5 w-3.5" />} />
              <Pill label="Live scouting" tone="cyan" icon={<Radar className="h-3.5 w-3.5" />} />
            </div>
          }
        />

        <GlassCard className="grid gap-6 md:grid-cols-[1.1fr,0.9fr] items-center">
          <div className="space-y-4">
            <p className="text-lg text-slate-200">Answers for the booth and sideline in one place—no extra lifts.</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBadge label="Call sheet decisions" value="Faster" tone="cyan" />
              <StatBadge label="Explosive alerts" value="Live" tone="emerald" />
              <StatBadge label="Booth + sideline view" value="Synced" tone="amber" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft"
              >
                Start membership
              </Link>
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
                  <Pill label="Charting" tone="emerald" />
                  <Pill label="Scouting" tone="cyan" />
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
                  Charting and scouting stay aligned
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
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Game-night focus</p>
                  <p className="text-base font-semibold text-slate-50">Fewer clicks, faster answers</p>
                </div>
                <Rocket className="h-6 w-6 text-brand" />
              </GlassCard>
            </div>
          </div>
        </GlassCard>

        <section id="outcomes" className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill label="Outcomes" tone="emerald" icon={<Trophy className="h-4 w-4" />} />
            <p className="text-sm text-slate-400">What staffs see when the system is live on game night.</p>
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
            <p className="text-sm text-slate-400">Concrete tools for practice, scouting, and Friday night.</p>
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
            <p className="text-sm text-slate-400">Pick the setup that matches your staff.</p>
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
                  <Link
                    href="/signup"
                    className="rounded-full bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black hover:bg-brand-soft"
                  >
                    Start {plan.name}
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-brand hover:text-white"
                  >
                    View demo deck
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        <section id="security" className="space-y-4">
          <div className="flex items-center gap-3">
            <Pill label="Security" tone="emerald" icon={<Fingerprint className="h-4 w-4" />} />
            <p className="text-sm text-slate-400">Built-in protections for your staff and data.</p>
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
            eyebrow="Ready to join"
            title="Start your membership"
            description="Pick your plan and create your account to get live charting and scouting."
            badge="Premium access"
          />
          <GlassCard>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft"
              >
                Start membership
              </Link>
            </div>
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





