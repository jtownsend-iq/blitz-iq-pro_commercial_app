import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'block' | 'pill'
}

export function Skeleton({ className, variant = 'block', ...rest }: SkeletonProps) {
  return (
    <div
      className={cx(
        'relative overflow-hidden bg-gradient-to-r from-white/5 via-white/10 to-white/5',
        'animate-[shimmer_1.4s_infinite]',
        variant === 'pill' ? 'rounded-full' : 'rounded-xl',
        className
      )}
      {...rest}
    />
  )
}

// Keyframe utility for Tailwind-less animation in components
const shimmer = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`

// Inject keyframes once in browser; no-op on server
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const id = 'blitziq-shimmer'
  if (!document.getElementById(id)) {
    const style = document.createElement('style')
    style.id = id
    style.textContent = shimmer
    document.head.appendChild(style)
  }
}
