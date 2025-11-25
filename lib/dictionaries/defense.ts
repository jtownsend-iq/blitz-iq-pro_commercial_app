import path from 'path'
import ExcelJS from 'exceljs'
import type { DefenseStructure } from './types'
export type { DefenseStructure } from './types'

let cachedDefense: DefenseStructure[] | null = null

export function getDefenseStructures(): DefenseStructure[] {
  throw new Error('getDefenseStructures is async; use getDefenseStructuresAsync instead.')
}

export async function getDefenseStructuresAsync(): Promise<DefenseStructure[]> {
  if (cachedDefense) return cachedDefense

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path.join(process.cwd(), 'data', 'Defense_Comprehensive.xlsx'))
  const sheet = workbook.worksheets[0]
  const rows: DefenseStructure[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const get = (col: number) => row.getCell(col).text ?? ''
    const name = get(1)
    rows.push({
      id: name.toUpperCase().replace(/\s+/g, '_'),
      name,
      analystNotes: get(2),
      source: get(3),
      description: get(4),
      notes: get(5),
      nuances: get(6),
      strategy: get(7),
      history: get(8),
    })
  })

  cachedDefense = rows.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
  return cachedDefense
}
