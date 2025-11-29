import OpenAI from 'openai'
import { env } from '@/utils/env'

const apiKey = env.openaiApiKey
const openaiClient = apiKey ? new OpenAI({ apiKey }) : null

type DriveSummaryInput = {
  unit: string
  totalYards: number
  plays: number
  explosivePlays: number
  turnovers: number
}

const FALLBACK_SUMMARY = (input: DriveSummaryInput) =>
  `Drive summary (${input.unit}): ${input.plays} plays for ${input.totalYards} yards (${input.explosivePlays} explosive, ${input.turnovers} turnovers).`

export async function generateDriveSummary(input: DriveSummaryInput): Promise<string> {
  if (!openaiClient) {
    return FALLBACK_SUMMARY(input)
  }

  const prompt = `You are an assistant coach summarizing a football drive for the ${input.unit} analysts. Provide a concise, energetic sentence or two that captures total plays, yardage, explosive plays, and turnovers. Here are the stats:
- Plays: ${input.plays}
- Yards: ${input.totalYards}
- Explosive plays: ${input.explosivePlays}
- Turnovers: ${input.turnovers}
`

  try {
    const response = await openaiClient.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
    })

    const content = response.output?.[0]
    if (content && 'content' in content && Array.isArray(content.content) && content.content[0]) {
      const textPart = content.content[0]
      if (textPart?.type === 'output_text' && textPart.text) {
        return textPart.text.trim()
      }
    }
  } catch (error) {
    console.error('generateDriveSummary error:', error)
  }

  return FALLBACK_SUMMARY(input)
}
