"use client"

import { forwardRef, useRef, useId, useEffect, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
> & {
  label?: string
  description?: string
  error?: string
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { label, description, error, indeterminate = false, disabled, ...props },
    ref
  ) {
    const internalRef = useRef<HTMLInputElement>(null)
    const inputRef = (ref || internalRef) as React.RefObject<HTMLInputElement>

    const generatedId = useId()
    const checkboxId = props.id || generatedId

    // Handle indeterminate state in effect
    useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate
      }
    }, [indeterminate, inputRef])

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            className="peer sr-only"
            aria-describedby={
              description ? `${checkboxId}-description` : undefined
            }
            aria-invalid={Boolean(error)}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none ${
              error
                ? 'border-red-500/50 bg-red-500/10'
                : 'border-white/20 bg-white/5 peer-checked:border-brand peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <Check
              className="h-3.5 w-3.5 scale-0 text-black transition-transform peer-checked:scale-100 motion-reduce:transition-none"
              strokeWidth={3}
              aria-hidden="true"
            />
          </label>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={`block text-sm font-medium ${
                  disabled ? 'text-slate-500' : 'text-slate-200'
                } ${error ? 'text-red-400' : ''} cursor-pointer`}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                id={`${checkboxId}-description`}
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
  }
)
