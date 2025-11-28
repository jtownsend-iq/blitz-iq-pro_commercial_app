type StatBadgeProps = {
  label: string
  value: string | number
  tone?: 'emerald' | 'cyan' | 'amber' | 'slate'
}

const toneMap: Record<NonNullable<StatBadgeProps['tone']>, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  slate: 'border-white/15 bg-white/5 text-slate-200',
}

export function StatBadge({ label, value, tone = 'slate' }: StatBadgeProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneMap[tone]} backdrop-blur`}>
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/70">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}
