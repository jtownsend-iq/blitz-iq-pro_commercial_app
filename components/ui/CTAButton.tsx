import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type CTAButtonProps = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>

export function CTAButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  className = '',
  ...rest
}: CTAButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold uppercase tracking-[0.2em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950'
  const sizes =
    size === 'sm'
      ? 'px-3 py-1.5 text-[0.72rem]'
      : 'px-4 py-2 text-[0.78rem]'
  const variants = {
    primary:
      'bg-brand text-black shadow-[0_15px_40px_-18px_rgba(0,229,255,0.6)] hover:bg-brand-soft disabled:opacity-60 disabled:cursor-not-allowed',
    secondary:
      'border border-white/15 bg-white/5 text-slate-100 hover:border-brand hover:text-white disabled:opacity-60 disabled:cursor-not-allowed',
    ghost:
      'text-slate-200 hover:text-white hover:bg-white/5 border border-transparent disabled:opacity-60 disabled:cursor-not-allowed',
  }[variant]

  const styles = [
    base,
    sizes,
    variants,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <Link href={href} className={styles} aria-label={rest['aria-label']}>
        {iconLeft}
        {children}
        {iconRight}
      </Link>
    )
  }

  return (
    <button className={styles} type={rest.type ?? 'button'} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  )
}
