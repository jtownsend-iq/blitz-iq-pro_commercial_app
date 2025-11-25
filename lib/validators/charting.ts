import type { DictionaryBundle } from '@/lib/dictionaries'

export type ChartValidationResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export type ChartValidationInput = {
  unit: 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
  play_family?: 'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS'
  offensive_personnel_code?: string | null
  offensive_formation_id?: string | null
  backfield_code?: string | null
  backs_count?: number | null
  wr_concept_id?: string | null
  run_concept?: string | null
  is_rpo?: boolean | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  st_play_type?: string | null
  st_variant?: string | null
  gained_yards?: number | null
  pass_result?: string | null
  st_return_yards?: number | null
}

export function validateChartEventInput(
  input: ChartValidationInput,
  dictionaries: DictionaryBundle
): ChartValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const personnel = input.offensive_personnel_code || ''
  if (input.unit === 'OFFENSE' || input.play_family === 'RUN' || input.play_family === 'PASS' || input.play_family === 'RPO') {
    if (!personnel) {
      errors.push('Offensive personnel is required.')
    }
  }

  if (input.offensive_formation_id) {
    const formation = dictionaries.offenseFormations.find((f) => f.id === input.offensive_formation_id)
    if (!formation) {
      errors.push('Selected formation is not recognized.')
    } else if (personnel && formation.personnel !== personnel) {
      errors.push('Formation does not match selected personnel.')
    }
  }

  if (input.backfield_code) {
    const backfield = dictionaries.backfieldOptions.find((b) => b.code === input.backfield_code)
    if (!backfield) {
      errors.push('Selected backfield is not recognized.')
    } else {
      if (input.backs_count != null && input.backs_count !== backfield.backs) {
        errors.push('Backfield backs count does not match selection.')
      }
      if (personnel && backfield.personnelGroups.length > 0 && !backfield.personnelGroups.includes(personnel)) {
        errors.push('Backfield not valid for selected personnel.')
      }
    }
  }

  if (input.play_family === 'PASS') {
    if (!input.wr_concept_id) {
      errors.push('Pass plays must include a WR concept.')
    }
  }

  if (input.play_family === 'RUN') {
    if (!input.run_concept) {
      errors.push('Run plays must include a run concept.')
    }
  }

  if (input.play_family === 'RPO' || input.is_rpo) {
    if (!input.run_concept || !input.wr_concept_id) {
      errors.push('RPO requires both run concept and pass concept.')
    }
  }

  if (input.coverage_shell_post && !input.coverage_shell_pre) {
    errors.push('Post-snap coverage provided without pre-snap shell.')
  }

  if (input.play_family === 'SPECIAL_TEAMS') {
    if (!input.st_play_type) {
      errors.push('Special teams play type is required.')
    }
    if (input.st_variant && input.st_variant.toUpperCase().includes('FAKE')) {
      if (!input.gained_yards && input.gained_yards !== 0) {
        errors.push('Fake special teams plays must include outcome yardage.')
      }
    }
  }

  if (input.play_family === 'RUN' || input.play_family === 'PASS' || input.play_family === 'RPO') {
    if (input.gained_yards == null) {
      warnings.push('Outcome yardage missing.')
    }
  }

  if (input.play_family === 'PASS' && input.pass_result && input.pass_result === 'INT' && (input.gained_yards == null)) {
    warnings.push('Interception logged without return yardage.')
  }

  if (input.st_return_yards != null && Math.abs(input.st_return_yards) > 150) {
    errors.push('Special teams return yards out of range.')
  }

  return { ok: errors.length === 0, errors, warnings }
}
