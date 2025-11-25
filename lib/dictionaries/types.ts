export type OffenseFormation = {
  id: string
  personnel: string
  formation: string
  family: string
  source: string
  notes: string
  analystNotes: string
  tripsFamily: string
  tripsContainsTE: boolean
  aliases: string[]
  personnelDifferences: string
}

export type BackfieldOption = {
  id: string
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

export type WRConcept = {
  id: string
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

export type DefenseStructure = {
  id: string
  name: string
  analystNotes: string
  source: string
  description: string
  notes: string
  nuances: string
  strategy: string
  history: string
}

export type DictionaryBundle = {
  offenseFormations: OffenseFormation[]
  offensePersonnel: string[]
  backfieldOptions: BackfieldOption[]
  backfieldFamilies: BackfieldFamily[]
  defenseStructures: DefenseStructure[]
  wrConcepts: WRConcept[]
}
