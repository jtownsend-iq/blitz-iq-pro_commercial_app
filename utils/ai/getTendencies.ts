import OpenAI from 'openai'
import { env } from '@/utils/env'
import {
  buildNumericSummary,
  isExplosivePlay,
  isSuccessfulPlay,
  yardLineFromBallOn,
} from '@/utils/stats/engine'
import type { PlayEvent } from '@/utils/stats/types'

const apiKey = env.openaiApiKey
const openaiClient = apiKey ? new OpenAI({ apiKey }) : null

export type NumericSummary = Record<string, { plays: number; success: number; explosive: number; ypp: number }>

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

export async function getAiTendenciesAndNextCall(params: {
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
  events: PlayEvent[]
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

export function buildLocalNumericSummary(unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS', events: PlayEvent[]): NumericSummary {
  const rolled = buildNumericSummary(unit, events)
  return rolled
}

export function rollUpFieldPosition(events: PlayEvent[]) {
  const st: Record<string, { totalStart: number; totalNet: number; sample: number }> = {}
  events.forEach((ev) => {
    const key = ev.st_play_type || 'ST'
    const yardLine = yardLineFromBallOn(ev.ball_on)
    st[key] = st[key] || { totalStart: 0, totalNet: 0, sample: 0 }
    st[key].sample += 1
    st[key].totalStart += yardLine
    st[key].totalNet += ev.gained_yards ?? 0
  })
  return Object.fromEntries(
    Object.entries(st).map(([k, v]) => [k, { avgStart: v.totalStart / v.sample, net: v.totalNet / v.sample, sample: v.sample }])
  )
}

export function buildSuccessAndExplosive(events: PlayEvent[]) {
  return events.reduce(
    (acc, ev) => {
      acc.plays += 1
      acc.success += isSuccessfulPlay(ev) ? 1 : 0
      acc.explosive += isExplosivePlay(ev) ? 1 : 0
      return acc
    },
    { plays: 0, success: 0, explosive: 0 }
  )
}
