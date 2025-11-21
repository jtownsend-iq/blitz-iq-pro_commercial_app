'use client'

import { useFormStatus } from 'react-dom'

type Props = {
  label: string
  pendingLabel: string
  disabled?: boolean
  className?: string
}

export function SubmitButton({ label, pendingLabel, disabled, className = '' }: Props) {
  const { pending } = useFormStatus()
  const isDisabled = disabled || pending
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
