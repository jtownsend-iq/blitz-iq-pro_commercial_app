import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import type { WRConcept } from './types'
export type { WRConcept } from './types'

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

  cachedConcepts = records.map((row) => {
    const name = row['CONCEPT_NAME'] ?? ''
    return {
      id: name.toUpperCase().replace(/\s+/g, '_'),
      name,
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
    }
  })

  cachedConcepts = cachedConcepts.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
  return cachedConcepts
}
