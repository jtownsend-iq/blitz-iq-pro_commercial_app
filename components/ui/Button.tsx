import Link from 'next/link'
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { colors } from '@/lib/ui/tokens'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = {
  children: ReactNode
  href?: string
  prefetch?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
  loading?: boolean
  className?: string
  onClick?: (event: MouseEvent<HTMLButtonElement> | MouseEvent<HTMLAnchorElement>) => void
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-surface shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft',
  secondary:
    'border border-white/12 bg-white/5 text-slate-100 hover:border-brand hover:text-white',
  ghost: 'text-slate-200 hover:text-white hover:bg-white/5 border border-transparent',
  destructive:
    'bg-[#7F1D1D] text-white border border-[#B91C1C]/60 hover:bg-[#991B1B] hover:border-[#DC2626]/80',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[0.72rem]',
  md: 'px-4 py-2 text-[0.78rem]',
  lg: 'px-5 py-2.5 text-[0.85rem]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    href,
    prefetch,
    variant = 'primary',
    size = 'md',
    iconLeft,
    iconRight,
    fullWidth,
    loading,
    disabled,
    className,
    onClick,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-[0.18em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transform-none active:translate-y-[0.5px] active:scale-[0.995]'

  const composed = cx(
    base,
    sizeClasses[size],
    variantClasses[variant],
    'disabled:opacity-60 disabled:cursor-not-allowed',
    fullWidth && 'w-full',
    className
  )

  const content = (
    <>
      {iconLeft ? (
        <span className="flex items-center" aria-hidden>
          {iconLeft}
        </span>
      ) : null}
      <span className="flex items-center gap-1">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </span>
      {iconRight ? (
        <span className="flex items-center" aria-hidden>
          {iconRight}
        </span>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        className={composed}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : rest.tabIndex}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (isDisabled) {
            event.preventDefault()
            event.stopPropagation()
            return
          }
          onClick?.(event)
        }}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      ref={ref}
      className={composed}
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading}
      onClick={onClick}
      {...rest}
    >
      {content}
      <span className="sr-only">{loading ? 'Loading' : undefined}</span>
    </button>
  )
})

// Backward-compatible alias for existing usage
export const CTAButton = Button

// Re-export color tokens for style co-location if needed by consumers.
export const buttonColors = {
  brand: colors.brand,
  brandSoft: colors.brandSoft,
  brandDark: colors.brandDark,
}
