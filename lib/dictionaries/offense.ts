import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'
import type {
  BackfieldFamily,
  BackfieldOption,
  OffenseFormation,
} from './types'
export type { BackfieldFamily, BackfieldOption, OffenseFormation } from './types'

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

  const mapped = records.map((row) => {
    const personnel = row['Personnel'] ?? row['﻿Personnel'] ?? ''
    const formation = row['Formation'] ?? ''
    const aliases = (row['Other_Used_Names'] ?? '')
      .split(';')
      .flatMap((s) => s.split(','))
      .map((s) => s.trim())
      .filter(Boolean)
    const tripsContainsTE = /^(true|1|yes)$/i.test((row['Trips_Contains_TE'] ?? '').toString().trim())
    return {
      id: `${personnel}-${formation}`.toUpperCase().replace(/\s+/g, '_'),
      personnel,
      formation,
      family: row['Family_or_System'] ?? '',
      source: row['Source'] ?? '',
      notes: row['Notes'] ?? '',
      analystNotes: row['Analyst_Notes'] ?? '',
      tripsFamily: row['Trips_Family'] ?? '',
      tripsContainsTE,
      aliases,
      personnelDifferences: row['Personnel_Differences'] ?? '',
    }
  })

  const deduped = new Map<string, OffenseFormation>()
  mapped.forEach((item) => {
    deduped.set(item.id, item)
  })

  cachedFormations = Array.from(deduped.values()).sort((a, b) => {
    const personnelCompare = a.personnel.localeCompare(b.personnel, 'en', { numeric: true })
    if (personnelCompare !== 0) return personnelCompare
    return a.formation.localeCompare(b.formation, 'en', { numeric: true })
  })

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

  cachedBackfields = records.map((row) => {
    const code = row['BACKFIELD CODE'] ?? ''
    return {
      id: code,
      code,
      backs: Number(row['BACKS'] ?? 0),
      personnelGroups: (row['PERSONNEL GROUPS'] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      description: row['DESCRIPTION'] ?? '',
    }
  })

  cachedBackfields = cachedBackfields.sort((a, b) => {
    if (a.backs !== b.backs) return a.backs - b.backs
    return a.code.localeCompare(b.code, 'en', { numeric: true })
  })

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

  cachedBackfieldFamilies = rows.sort((a, b) =>
    a.backsLabel.localeCompare(b.backsLabel, 'en', { numeric: true })
  )
  return cachedBackfieldFamilies
}
