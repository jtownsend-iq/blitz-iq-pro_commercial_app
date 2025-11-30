import OpenAI from 'openai'
import { env } from '@/utils/env'

const apiKey = env.openaiApiKey
const openaiClient = apiKey ? new OpenAI({ apiKey }) : null

export type TendencyEvent = {
  play_family?: 'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS' | null
  run_concept?: string | null
  wr_concept_id?: string | null
  st_play_type?: string | null
  st_variant?: string | null
  front_code?: string | null
  defensive_structure_id?: string | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  gained_yards: number | null
  down: number | null
  distance: number | null
  ball_on: string | null
  drive_number?: number | null
  created_at: string | null
}

export type NumericSummary = {
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
  byFamily?: Record<
    string,
    {
      plays: number
      success: number
      explosive: number
      ypp: number
    }
  >
  byCoverage?: Record<string, { plays: number; ypp: number; explosive: number }>
  byFront?: Record<string, { plays: number; ypp: number; explosive: number }>
  stFieldPos?: Record<string, { avgStart: number; net: number; sample: number }>
}

export type AiRecommendation = {
  label: string
  rationale: string
  successProbability: number
  statLine: string
}

export type AiTendencyResult = {
  summary: string
  recommendations: AiRecommendation[]
  source: 'openai' | 'fallback'
}

type Situation = {
  down?: number | null
  distance?: number | null
  yardLine?: number | null
  hash?: string | null
  drive?: number | null
  series?: string | null
}

const FALLBACK: AiTendencyResult = {
  summary: 'Tendencies loading — chart a few plays to unlock situation-aware suggestions.',
  recommendations: [],
  source: 'fallback',
}

export function buildNumericSummary(unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS', events: TendencyEvent[]): NumericSummary {
  const summary: NumericSummary = { unit }

  if (unit === 'OFFENSE') {
    summary.byFamily = rollUp(events, (ev) => ev.play_family || 'UNKNOWN')
  } else if (unit === 'DEFENSE') {
    summary.byCoverage = rollUp(events, (ev) => ev.coverage_shell_post || ev.coverage_shell_pre || 'Coverage')
    summary.byFront = rollUp(events, (ev) => ev.front_code || 'Front')
  } else {
    const st: Record<string, { totalStart: number; totalNet: number; sample: number }> = {}
    events.forEach((ev) => {
      const key = ev.st_play_type || 'ST'
      const yardLine = yardLineFromBallOn(ev.ball_on)
      st[key] = st[key] || { totalStart: 0, totalNet: 0, sample: 0 }
      st[key].sample += 1
      st[key].totalStart += yardLine
      st[key].totalNet += ev.gained_yards ?? 0
    })
    summary.stFieldPos = Object.fromEntries(
      Object.entries(st).map(([k, v]) => [k, { avgStart: v.totalStart / v.sample, net: v.totalNet / v.sample, sample: v.sample }])
    )
  }

  return summary
}

export async function getAiTendenciesAndNextCall(params: {
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
  events: TendencyEvent[]
  numericSummary: NumericSummary
  situation: Situation
  fallback: AiTendencyResult
}): Promise<AiTendencyResult> {
  if (!openaiClient) return { ...params.fallback, source: 'fallback' }
  if (params.events.length === 0) return FALLBACK

  const payload = {
    unit: params.unit,
    situation: params.situation,
    numericSummary: params.numericSummary,
  }

  const prompt = `You are a concise booth analyst. Given numeric tendencies and the live situation, respond with JSON only.
Return: {"summary": string, "recommendations": [{"label": string, "rationale": string, "successProbability": number, "statLine": string}]}
Use game-only data. Keep recommendations to 3.
Data: ${JSON.stringify(payload)}`

  try {
    const response = await openaiClient.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
    })
    const content = response.output?.[0]
    if (content && 'content' in content && Array.isArray(content.content) && content.content[0]) {
      const textPart = content.content[0]
      if (textPart?.type === 'output_text' && textPart.text) {
        const parsed = JSON.parse(textPart.text)
        if (parsed && parsed.summary && Array.isArray(parsed.recommendations)) {
          return {
            summary: parsed.summary,
            recommendations: parsed.recommendations.map((rec: { label?: string; rationale?: string; successProbability?: number; statLine?: string }) => ({
              label: rec.label,
              rationale: rec.rationale,
              successProbability: Number(rec.successProbability ?? 0),
              statLine: rec.statLine || '',
            })),
            source: 'openai',
          }
        }
      }
    }
  } catch (error) {
    console.error('getAiTendenciesAndNextCall error:', error)
  }

  return params.fallback
}

function rollUp(list: TendencyEvent[], keyFn: (ev: TendencyEvent) => string) {
  const map = new Map<
    string,
    {
      plays: number
      success: number
      explosive: number
      yards: number
    }
  >()
  list.forEach((ev) => {
    const key = keyFn(ev)
    if (!key) return
    const bucket = map.get(key) || { plays: 0, success: 0, explosive: 0, yards: 0 }
    bucket.plays += 1
    bucket.success += isSuccessful(ev) ? 1 : 0
    bucket.explosive += isExplosive(ev) ? 1 : 0
    bucket.yards += ev.gained_yards ?? 0
    map.set(key, bucket)
  })
  return Object.fromEntries(
    Array.from(map.entries()).map(([label, stats]) => [
      label,
      {
        plays: stats.plays,
        success: stats.plays ? stats.success / stats.plays : 0,
        explosive: stats.plays ? stats.explosive / stats.plays : 0,
        ypp: stats.plays ? stats.yards / stats.plays : 0,
      },
    ])
  )
}

function isSuccessful(ev: TendencyEvent) {
  if (ev.down == null || ev.distance == null || ev.gained_yards == null) return false
  if (ev.down === 1) return ev.gained_yards >= ev.distance * 0.5
  if (ev.down === 2) return ev.gained_yards >= ev.distance * 0.7
  return ev.gained_yards >= ev.distance
}

function isExplosive(ev: TendencyEvent) {
  return (ev.gained_yards ?? 0) >= 20
}

function yardLineFromBallOn(ball_on: string | null) {
  if (!ball_on) return 50
  const num = Number(ball_on.replace(/[^0-9]/g, ''))
  if (Number.isNaN(num)) return 50
  if (ball_on.toUpperCase().startsWith('O')) return num
  if (ball_on.toUpperCase().startsWith('D') || ball_on.toUpperCase().startsWith('X')) return 100 - num
  return num
}
