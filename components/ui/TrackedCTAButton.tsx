'use client'

import { CTAButton } from './CTAButton'
import type { CTAButtonProps } from './CTAButton'
import { trackEvent } from '@/utils/telemetry'

type TrackedCTAButtonProps = CTAButtonProps & {
  event: string
  payload?: Record<string, unknown>
  source?: string
}

export function TrackedCTAButton({
  event,
  payload,
  source = 'scouting_page',
  onClick,
  ...rest
}: TrackedCTAButtonProps) {
  const handleClick: NonNullable<CTAButtonProps['onClick']> = (e) => {
    trackEvent(event, payload, source)
    if (onClick) onClick(e)
  }

  return <CTAButton {...rest} onClick={handleClick} />
}
