import {
  getBackfieldFamiliesAsync,
  getBackfieldOptions,
  getOffenseFormations,
  getOffensePersonnelCodes,
} from './offense'
import { getDefenseStructuresAsync } from './defense'
import { getWRConcepts } from './wrConcepts'
import type { DictionaryBundle } from './types'
export type { DictionaryBundle } from './types'

let cachedBundle: DictionaryBundle | null = null

export async function loadDictionaryBundle(): Promise<DictionaryBundle> {
  if (cachedBundle) return cachedBundle

  const [backfieldFamilies, defenseStructures] = await Promise.all([
    getBackfieldFamiliesAsync(),
    getDefenseStructuresAsync(),
  ])

  cachedBundle = {
    offenseFormations: getOffenseFormations(),
    offensePersonnel: getOffensePersonnelCodes(),
    backfieldOptions: getBackfieldOptions(),
    backfieldFamilies,
    defenseStructures,
    wrConcepts: getWRConcepts(),
  }

  return cachedBundle
}
