import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

export type WRConcept = {
  name: string
  family: string
  summary: string
  coverageBeater: string[]
  qbDrop: string
  primaryPersonnel: string[]
  primaryFormations: string[]
  primaryBackfield: string[]
  routes: {
    X?: string
    Z?: string
    Y?: string
    H?: string
    RB?: string
  }
}

let cachedConcepts: WRConcept[] | null = null

export function getWRConcepts(): WRConcept[] {
  if (cachedConcepts) return cachedConcepts

  const csvPath = path.join(process.cwd(), 'data', 'WR_Concepts_ByPosition_Personnel_Formation_Backfield.csv')
  const text = fs.readFileSync(csvPath, 'utf8')
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[]

  cachedConcepts = records.map((row) => ({
    name: row['CONCEPT_NAME'] ?? '',
    family: row['CONCEPT_FAMILY'] ?? '',
    summary: row['SUMMARY'] ?? '',
    coverageBeater: (row['PRIMARY_COVERAGE_BEATER'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    qbDrop: row['QB_DROP'] ?? '',
    primaryPersonnel: (row['PRIMARY_PERSONNEL'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    primaryFormations: (row['PRIMARY_FORMATIONS'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    primaryBackfield: (row['PRIMARY_BACKFIELD'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    routes: {
      X: row['X_ROUTE'] ?? '',
      Z: row['Z_ROUTE'] ?? '',
      Y: row['Y_ROUTE'] ?? '',
      H: row['H_ROUTE'] ?? '',
      RB: row['RB_ROUTE'] ?? '',
    },
  }))

  return cachedConcepts
}
