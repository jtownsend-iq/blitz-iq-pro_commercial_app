import path from 'path'
import ExcelJS from 'exceljs'

export type DefenseStructure = {
  name: string
  description: string
  nuances: string
  strategy: string
}

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
    rows.push({
      name: get(1),
      description: get(4),
      nuances: get(6),
      strategy: get(7),
    })
  })

  cachedDefense = rows
  return cachedDefense
}
