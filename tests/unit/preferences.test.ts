import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyAnalyticsPreferences } from '@/lib/stats/preferences'
import type { PlayEvent } from '@/utils/stats/types'

test('applyAnalyticsPreferences respects custom thresholds and ignores turnovers on downs', () => {
  const prefs = { explosiveRun: 15, explosivePass: 25, includeTurnoverOnDowns: false }
  const events: PlayEvent[] = [
    { id: '1', team_id: 't', game_id: 'g', gained_yards: 18, play_family: 'RUN' } as PlayEvent,
    { id: '2', team_id: 't', game_id: 'g', gained_yards: 30, play_family: 'PASS' } as PlayEvent,
    {
      id: '3',
      team_id: 't',
      game_id: 'g',
      gained_yards: 2,
      play_family: 'RUN',
      turnover: true,
      turnover_detail: { type: 'DOWNS', lostBy: 'OFFENSE', lostBySide: 'TEAM' } as PlayEvent['turnover_detail'],
    } as PlayEvent,
  ]

  const adjusted = applyAnalyticsPreferences(events, prefs)

  assert.equal(adjusted[0].explosive, true, 'run meets custom explosive threshold')
  assert.equal(adjusted[1].explosive, true, 'pass meets custom explosive threshold')
  assert.equal(adjusted[2].turnover, false, 'turnover on downs ignored when preference disabled')
})
