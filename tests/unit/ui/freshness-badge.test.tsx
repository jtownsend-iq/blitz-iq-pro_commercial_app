import test from 'node:test'
import { strictEqual, ok } from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FreshnessBadge, computeFreshnessState } from '@/components/ui/FreshnessBadge'

test('computeFreshnessState toggles fresh, stale, and offline thresholds', () => {
  const now = Date.parse('2025-01-01T00:10:00Z')
  strictEqual(computeFreshnessState('2025-01-01T00:09:45Z', now), 'fresh')
  strictEqual(computeFreshnessState('2025-01-01T00:07:30Z', now), 'stale')
  strictEqual(computeFreshnessState(null, now), 'offline')
})

test('FreshnessBadge renders accessible status text', () => {
  const html = renderToStaticMarkup(
    createElement(FreshnessBadge, {
      label: 'Live stats',
      lastUpdated: '2025-01-01T00:00:00Z',
      now: Date.parse('2025-01-01T00:00:20Z'),
    })
  )
  ok(html.includes('Live stats'))
  ok(html.toLowerCase().includes('fresh'))
  ok(html.includes('20s ago'))
})
