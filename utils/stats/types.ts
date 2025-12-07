// Central domain types for charting, scouting, and stats computation.

export type ChartUnit = 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'

export type FieldZone = 'BACKED_UP' | 'COMING_OUT' | 'OPEN_FIELD' | 'SCORING_RANGE' | 'RED_ZONE'

export type ScoreState = {
  team: number | null
  opponent: number | null
}

export type PenaltyEvent = {
  occurred: boolean
  team: ChartUnit | null
  yards: number | null
  declined: boolean
  offsetting: boolean
  automaticFirstDown: boolean
  type: string | null
  enforced_spot?: string | null
}

export type TurnoverEvent = {
  type: 'INTERCEPTION' | 'FUMBLE' | 'DOWNS' | 'BLOCKED_KICK' | 'OTHER' | null
  lostBy: ChartUnit | null
  returnYards: number | null
  recoveredBy?: string | null
  forcedBy?: string | null
}

export type ScoringEvent = {
  team: ChartUnit | null
  points: number
  creditedTo: ChartUnit | null
  type: 'TD' | 'FG' | 'PAT' | 'TWO_POINT' | 'SAFETY' | 'DEF_TD' | 'ST_TD' | 'OTHER'
  returnYards?: number | null
}

export type PlayerParticipation = {
  quarterback?: string | null
  primaryBallcarrier?: string | null
  primaryTarget?: string | null
  receivers?: string[] | null
  soloTacklers?: string[] | null
  assistedTacklers?: string[] | null
  passDefenders?: string[] | null
  interceptors?: string[] | null
  sackers?: string[] | null
  forcedFumble?: string | null
  recovery?: string | null
  kicker?: string | null
  punter?: string | null
  longSnapper?: string | null
  holder?: string | null
  returner?: string | null
  coverage?: string[] | null
}

export type PlayEvent = {
  id: string
  team_id: string
  opponent_id?: string | null
  opponent_name?: string | null
  game_id: string
  game_session_id?: string | null
  season_id?: string | null
  season_label?: string | null
  sequence?: number | null
  quarter: number | null
  clock_seconds: number | null
  absolute_clock_seconds?: number | null
  down: number | null
  distance: number | null
  ball_on: string | null
  hash_mark?: string | null
  field_position?: number | null
  field_zone?: FieldZone | null
  possession?: ChartUnit | string | null
  offense_score_before?: number | null
  defense_score_before?: number | null
  offense_score_after?: number | null
  defense_score_after?: number | null
  offense_timeouts?: number | null
  defense_timeouts?: number | null
  drive_number?: number | null
  drive_id?: string | null
  series_tag?: string | null
  is_drive_start?: boolean
  is_drive_end?: boolean
  is_half_start?: boolean
  is_half_end?: boolean
  is_game_start?: boolean
  is_game_end?: boolean
  play_call?: string | null
  result?: string | null
  gained_yards?: number | null
  explosive?: boolean | null
  turnover?: boolean | null
  first_down?: boolean | null
  play_family?: 'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS' | null
  run_concept?: string | null
  pass_concept?: string | null
  wr_concept_id?: string | null
  st_play_type?: string | null
  st_variant?: string | null
  st_return_yards?: number | null
  motion?: boolean | null
  shift?: boolean | null
  play_action?: boolean | null
  shot?: boolean | null
  tempo_tag?: string | null
  hash_preference?: string | null
  offensive_personnel_code?: string | null
  offensive_formation_id?: string | null
  backfield_code?: string | null
  qb_alignment?: string | null
  defensive_structure_id?: string | null
  front_code?: string | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  pressure_code?: string | null
  strength?: string | null
  alignment_tags?: string[] | null
  scoring?: ScoringEvent | null
  turnover_detail?: TurnoverEvent | null
  penalties?: PenaltyEvent[]
  participation?: PlayerParticipation | null
  tags?: string[]
  notes?: string | null
  created_at?: string | null
}

export type DriveRecord = {
  id?: string | null
  drive_number: number
  team_id: string
  game_id: string
  unit: ChartUnit
  play_ids: string[]
  start_field_position: number | null
  end_field_position: number | null
  start_time_seconds: number | null
  end_time_seconds: number | null
  start_score: ScoreState | null
  end_score: ScoreState | null
  yards: number
  result: string | null
}

export type BaseCounts = {
  plays: number
  totalYards: number
  explosives: number
  scoringPlays: number
  turnovers: number
  penalties: { count: number; yards: number }
  firstDowns: number
  drives: number
}

export type BoxScoreMetrics = {
  plays: number
  totalYards: number
  yardsPerPlay: number
  explosives: number
  explosiveRate: number
  turnovers: number
  scoringPlays: number
  successRate: number
  lateDown: { attempts: number; conversions: number; rate: number }
  redZoneTrips: number
  averageStart: number | null
  averageDepth: number | null
}

export type CoreWinningMetrics = {
  pointsPerDrive: number
  turnoverMargin: number
  explosiveMargin: number
  successMargin: number
  redZoneEfficiency: number
}

export type AdvancedAnalytics = {
  estimatedEPA: number
  estimatedEPAperPlay: number
  havocRate: number
  leverageRate: number
  fieldPositionAdvantage: number
}

export type SeasonProjection = {
  gamesModeled: number
  projectedWinRate: number
  projectedPointsPerGame: number
  projectedPointsAllowed: number
  notes: string
}
