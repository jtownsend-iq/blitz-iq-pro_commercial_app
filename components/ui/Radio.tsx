"use client"

import { forwardRef, useRef, useId, type InputHTMLAttributes } from 'react'

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> & {
  label?: string
  description?: string
  error?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, description, error, disabled, ...props },
  ref
) {
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = (ref || internalRef) as React.RefObject<HTMLInputElement>

  const generatedId = useId()
  const radioId = props.id || generatedId

  return (
    <div className="flex items-start gap-3">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="radio"
          id={radioId}
          disabled={disabled}
          className="peer sr-only"
          aria-describedby={
            description ? `${radioId}-description` : undefined
          }
          {...props}
        />
        <label
          htmlFor={radioId}
          className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none ${
            error
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-white/20 bg-white/5 peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <div
            className="h-2 w-2 scale-0 rounded-full bg-brand transition-transform peer-checked:scale-100 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </label>
      </div>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={radioId}
              className={`block text-sm font-medium ${
                disabled ? 'text-slate-500' : 'text-slate-200'
              } ${error ? 'text-red-400' : ''} cursor-pointer`}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              id={`${radioId}-description`}
              className="mt-0.5 text-xs text-slate-400"
            >
              {description}
            </p>
          )}
          {error && (
            <p className="mt-1 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
})

export type RadioGroupProps = {
  name: string
  value: string
  onChange: (value: string) => void
  options: Array<{
    value: string
    label: string
    description?: string
    disabled?: boolean
  }>
  error?: string
  label?: string
  className?: string
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  error,
  label,
  className = '',
}: RadioGroupProps) {
  const groupId = useId()

  return (
    <div className={className} role="radiogroup" aria-labelledby={label ? `${groupId}-label` : undefined}>
      {label && (
        <p id={`${groupId}-label`} className="mb-3 text-sm font-medium text-slate-200">
          {label}
        </p>
      )}
      <div className="space-y-3">
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => e.target.checked && onChange(option.value)}
            label={option.label}
            description={option.description}
            disabled={option.disabled}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
