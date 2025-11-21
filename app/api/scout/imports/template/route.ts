import { NextResponse } from 'next/server'

const TEMPLATE_HEADERS = [
  'phase',
  'down',
  'distance',
  'hash',
  'field_position',
  'quarter',
  'time_remaining_seconds',
  'formation',
  'personnel',
  'front',
  'coverage',
  'pressure',
  'play_family',
  'result',
  'gained_yards',
  'explosive',
  'turnover',
  'tags',
]

const SAMPLE_ROW = [
  'OFFENSE',
  '1',
  '10',
  'M',
  '45',
  '1',
  '720',
  'Trips Right',
  '10/11',
  'Over',
  'Quarters',
  'Sim',
  'Pass',
  'Gain 12',
  '12',
  'false',
  'false',
  '3rd-and-long,play-action,right-hash',
]

export async function GET() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${SAMPLE_ROW.join(',')}\n`
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="scout_template.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
