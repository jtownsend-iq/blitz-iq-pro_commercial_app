'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  label: string
  pendingLabel?: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  className?: string
}

export function ActionButton({
  label,
  pendingLabel = 'Working...',
  variant = 'primary',
  disabled,
  className = '',
}: Props) {
  const { pending } = useFormStatus()
  const isDisabled = disabled || pending

  const base =
    variant === 'primary'
      ? 'rounded-full bg-brand px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black'
      : 'rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500 hover:text-slate-100 transition'

  return (
    <button type="submit" disabled={isDisabled} className={`${base} ${className} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {pending ? pendingLabel : label}
    </button>
  )
}
