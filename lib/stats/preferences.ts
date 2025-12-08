import type { PlayEvent } from '@/utils/stats/types'
import type { AnalyticsPreferences } from '../preferences'

function computeExplosive(ev: PlayEvent, prefs: AnalyticsPreferences): boolean {
  const yards = ev.gained_yards ?? 0
  const family = ev.play_family ?? (ev.st_play_type ? 'SPECIAL_TEAMS' : null)
  if (family === 'PASS') return yards >= prefs.explosivePass
  if (family === 'SPECIAL_TEAMS') return yards >= Math.max(30, prefs.explosivePass)
  return yards >= prefs.explosiveRun
}

export function applyAnalyticsPreferences(
  events: PlayEvent[],
  prefs: AnalyticsPreferences
): PlayEvent[] {
  return events.map((ev) => {
    const isTurnoverOnDowns = ev.turnover_detail?.type === 'DOWNS'
    const adjustedTurnoverDetail =
      prefs.includeTurnoverOnDowns === false && isTurnoverOnDowns ? null : ev.turnover_detail ?? null

    const turnoverFlag =
      prefs.includeTurnoverOnDowns === false && isTurnoverOnDowns
        ? false
        : adjustedTurnoverDetail
          ? true
          : Boolean(ev.turnover)

    return {
      ...ev,
      explosive: computeExplosive(ev, prefs),
      turnover: turnoverFlag,
      turnover_detail: adjustedTurnoverDetail,
    }
  })
}
