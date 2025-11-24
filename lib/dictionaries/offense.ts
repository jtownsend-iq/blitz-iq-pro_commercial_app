import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'

export type OffenseFormation = {
  personnel: string
  formation: string
  family: string
  aliases: string[]
  notes: string
}

export type BackfieldOption = {
  code: string
  backs: number
  personnelGroups: string[]
  description: string
}

export type BackfieldFamily = {
  backsLabel: string
  classification: string
  families: string
  defaultQBAlignment: string
}

let cachedFormations: OffenseFormation[] | null = null
let cachedBackfields: BackfieldOption[] | null = null
let cachedBackfieldFamilies: BackfieldFamily[] | null = null

const dataDir = path.join(process.cwd(), 'data')

export function getOffenseFormations(): OffenseFormation[] {
  if (cachedFormations) return cachedFormations

  const csvPath = path.join(dataDir, 'Offense_Formations.csv')
  const text = fs.readFileSync(csvPath, 'utf8')
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  cachedFormations = records.map((row) => ({
    personnel: row['Personnel'] ?? '',
    formation: row['Formation'] ?? '',
    family: row['Family_or_System'] ?? '',
    aliases: (row['Other_Used_Names'] ?? '')
      .split(';')
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean),
    notes: row['Notes'] ?? '',
  }))

  return cachedFormations
}

export function getOffensePersonnelCodes(): string[] {
  const formations = getOffenseFormations()
  const unique = Array.from(new Set(formations.map((f) => f.personnel).filter(Boolean)))
  return unique.sort()
}

export function getBackfieldOptions(): BackfieldOption[] {
  if (cachedBackfields) return cachedBackfields

  const csvPath = path.join(dataDir, 'BackfieldOptions.csv')
  const text = fs.readFileSync(csvPath, 'utf8')
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  cachedBackfields = records.map((row) => ({
    code: row['BACKFIELD CODE'] ?? '',
    backs: Number(row['BACKS'] ?? 0),
    personnelGroups: (row['PERSONNEL GROUPS'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    description: row['DESCRIPTION'] ?? '',
  }))

  return cachedBackfields
}

export function getBackfieldFamilies(): BackfieldFamily[] {
  throw new Error('getBackfieldFamilies is async; use getBackfieldFamiliesAsync instead.')
}

export async function getBackfieldFamiliesAsync(): Promise<BackfieldFamily[]> {
  if (cachedBackfieldFamilies) return cachedBackfieldFamilies

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path.join(dataDir, 'Offense_Backfields.xlsx'))
  const sheet = workbook.worksheets[0]
  const rows: BackfieldFamily[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const get = (col: number) => row.getCell(col).text ?? ''
    rows.push({
      backsLabel: get(1),
      classification: get(2),
      families: get(3),
      defaultQBAlignment: get(4),
    })
  })

  cachedBackfieldFamilies = rows
  return cachedBackfieldFamilies
}
