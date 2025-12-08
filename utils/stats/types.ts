// Central domain types for charting, scouting, and stats computation.

export type ChartUnit = 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS'
export type PlayFamily = 'RUN' | 'PASS' | 'RPO' | 'SPECIAL_TEAMS'

export type FieldZone = 'BACKED_UP' | 'COMING_OUT' | 'OPEN_FIELD' | 'SCORING_RANGE' | 'RED_ZONE'

export type ScoreState = {
  team: number | null
  opponent: number | null
}

export type TimeoutState = {
  team: number | null
  opponent: number | null
  offense: number | null
  defense: number | null
}

export type BoundaryFlags = {
  is_drive_start?: boolean
  is_drive_end?: boolean
  is_half_start?: boolean
  is_half_end?: boolean
  is_game_start?: boolean
  is_game_end?: boolean
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
  lostBySide?: 'TEAM' | 'OPPONENT' | null
  turnover_team_id?: string | null
  returnYards: number | null
  recoveredBy?: string | null
  forcedBy?: string | null
}

export type ScoringEvent = {
  team: ChartUnit | null
  scoring_team_id?: string | null
  scoring_team_side?: 'TEAM' | 'OPPONENT' | null
  points: number
  creditedTo: ChartUnit | null
  type: 'TD' | 'FG' | 'PAT' | 'TWO_POINT' | 'SAFETY' | 'DEF_TD' | 'ST_TD' | 'OTHER'
  returnYards?: number | null
}

export type OffensiveContext = {
  personnel_code?: string | null
  formation_id?: string | null
  backfield_code?: string | null
  qb_alignment?: string | null
  play_family?: PlayFamily | null
  run_concept?: string | null
  run_concept_id?: string | null
  pass_concept?: string | null
  pass_concept_id?: string | null
  motion?: boolean | null
  shift?: boolean | null
  play_action?: boolean | null
  shot?: boolean | null
  tempo_tag?: string | null
  hash_preference?: string | null
}

export type DefensiveContext = {
  front_code?: string | null
  defensive_structure_id?: string | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  pressure_code?: string | null
  strength?: string | null
  alignment_tags?: string[] | null
}

export type SpecialTeamsContext = {
  play_type?: string | null
  variant?: string | null
  return_yards?: number | null
  unit_on_field?: ChartUnit | null
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
  qbHurries?: string[] | null
  kicker?: string | null
  punter?: string | null
  longSnapper?: string | null
  holder?: string | null
  returner?: string | null
  coverage?: string[] | null
  primaryCoverage?: string | null
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
  possession_team_id?: string | null
  sequence?: number | null
  quarter: number | null
  clock_seconds: number | null
  absolute_clock_seconds?: number | null
  down: number | null
  distance: number | null
  ball_on: string | null
  ball_spot?: string | null
  hash_mark?: string | null
  field_position?: number | null
  field_zone?: FieldZone | null
  possession?: ChartUnit | string | null
  score_before?: ScoreState | null
  score_after?: ScoreState | null
  offense_score_before?: number | null
  defense_score_before?: number | null
  offense_score_after?: number | null
  defense_score_after?: number | null
  team_score_before?: number | null
  opponent_score_before?: number | null
  team_score_after?: number | null
  opponent_score_after?: number | null
  timeouts_before?: TimeoutState | null
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
  boundaries?: BoundaryFlags
  play_call?: string | null
  result?: string | null
  gained_yards?: number | null
  yards_after_catch?: number | null
  explosive?: boolean | null
  turnover?: boolean | null
  first_down?: boolean | null
  play_family?: PlayFamily | null
  run_concept?: string | null
  run_concept_id?: string | null
  pass_concept?: string | null
  pass_concept_id?: string | null
  pass_result?: string | null
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
  offensive_context?: OffensiveContext | null
  defensive_structure_id?: string | null
  front_code?: string | null
  coverage_shell_pre?: string | null
  coverage_shell_post?: string | null
  pressure_code?: string | null
  strength?: string | null
  alignment_tags?: string[] | null
  defensive_context?: DefensiveContext | null
  special_teams_context?: SpecialTeamsContext | null
  scoring?: ScoringEvent | null
  turnover_detail?: TurnoverEvent | null
  penalties?: PenaltyEvent[]
  participation?: PlayerParticipation | null
  tags?: string[]
  notes?: string | null
  created_at?: string | null
}

export type DriveResultType =
  | 'TD'
  | 'FG'
  | 'MISS_FG'
  | 'PUNT'
  | 'DOWNS'
  | 'TURNOVER'
  | 'END_HALF'
  | 'END_GAME'
  | 'SAFETY'
  | 'UNKNOWN'

export type DriveRecord = {
  id?: string | null
  drive_number: number
  team_id: string
  opponent_id?: string | null
  game_id: string
  season_id?: string | null
  unit: ChartUnit
  unit_on_field?: ChartUnit | null
  possession_team_id?: string | null
  play_ids: string[]
  start_field_position: number | null
  end_field_position: number | null
  start_time_seconds: number | null
  end_time_seconds: number | null
  start_score: ScoreState | null
  end_score: ScoreState | null
  yards: number
  result: DriveResultType | string | null
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
  pointsFor: number
  pointsAllowed: number
  scoringEvents: ScoringEvent[]
  turnoverEvents: TurnoverEvent[]
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
  thirdDown: ConversionSummary
  fourthDown: ConversionSummary
  lateDown: ConversionSummary
  redZoneTrips: number
  averageStart: number | null
  averageDepth: number | null
}

export type PassingStatLine = {
  attempts: number
  completions: number
  yards: number
  yardsPerAttempt: number
  yardsPerCompletion: number
  touchdowns: number
  interceptions: number
  sacks: number
  sackYards: number
  longest: number
  passerRating: number
  qbr?: number
}

export type PassingBoxScore = {
  team: PassingStatLine
  players: Record<string, PassingStatLine>
}

export type RushingStatLine = {
  attempts: number
  yards: number
  yardsPerCarry: number
  touchdowns: number
  fumbles: number
  fumblesLost: number
  longest: number
}

export type RushingBoxScore = {
  team: RushingStatLine
  players: Record<string, RushingStatLine>
}

export type ReceivingStatLine = {
  targets: number
  receptions: number
  yards: number
  yardsAfterCatch: number
  yardsPerReception: number
  catchPct: number
  touchdowns: number
  longest: number
}

export type ReceivingBoxScore = {
  team: ReceivingStatLine
  players: Record<string, ReceivingStatLine>
}

export type DefensiveStatLine = {
  solo: number
  assisted: number
  total: number
  sacks: number
  sackYards: number
  tfl: number
  passesDefended: number
  interceptions: number
  interceptionYards: number
  interceptionTouchdowns: number
  forcedFumbles: number
  fumbleRecoveries: number
  fumbleReturnYards: number
  fumbleReturnTouchdowns: number
  hurries: number
}

export type DefensiveBoxScore = {
  team: DefensiveStatLine
  players: Record<string, DefensiveStatLine>
}

export type KickingStatLine = {
  fgMade: number
  fgAtt: number
  fgPct: number
  extraMade: number
  extraAtt: number
  extraPct: number
  longestFg: number
  points: number
  bands: FieldGoalSplits['bands']
}

export type KickingBoxScore = {
  team: KickingStatLine
  players: Record<string, KickingStatLine>
}

export type PuntingStatLine = {
  punts: number
  yards: number
  gross: number
  net: number
  touchbacks: number
  inside20: number
  longest: number
}

export type PuntingBoxScore = {
  team: PuntingStatLine
  players: Record<string, PuntingStatLine>
}

export type ReturnBoxScore = {
  kickoff: ReturnMetrics
  punt: ReturnMetrics
}

export type TeamBoxScoreSummary = {
  totalYards: number
  passingYards: number
  rushingYards: number
  plays: number
  yardsPerPlay: number
  firstDowns: { total: number; rushing: number; passing: number; penalty: number }
  thirdDown: ConversionSummary
  fourthDown: ConversionSummary
  turnovers: { total: number; interceptions: number; fumblesLost: number }
  penalties: { count: number; yards: number }
  timeOfPossessionSeconds: number | null
  redZone: { trips: number; scores: number; touchdowns: number }
}

export type BoxScoreReport = {
  passing: PassingBoxScore
  rushing: RushingBoxScore
  receiving: ReceivingBoxScore
  defense: DefensiveBoxScore
  kicking: KickingBoxScore
  punting: PuntingBoxScore
  returns: ReturnBoxScore
  team: TeamBoxScoreSummary
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
  expectedPointsModel: {
    latest: ExpectedPointsResult | null
    curve: number[]
  }
  epa: EpaAggregate
  winProbability: WinProbabilitySummary
  postGameWinExpectancy: PostGameWinExpectancy
  spPlus: SpPlusLikeRatings
  anyA: AdjustedNetYardsPerAttempt
  qbr: QuarterbackRatings
  seasonSimulation?: SeasonSimulationResult
  gameControl: GameControlMetric
}

export type TurnoverBucketCounts = {
  interceptions: number
  fumbles: number
  downs: number
  blockedKicks: number
  other: number
}

export type TurnoverSummary = {
  takeaways: number
  giveaways: number
  margin: number
  takeawaysByType: TurnoverBucketCounts
  giveawaysByType: TurnoverBucketCounts
  includeTurnoverOnDowns: boolean
}

export type ExplosiveBreakdown = {
  plays: number
  explosives: number
  rate: number
  run: { plays: number; explosives: number; rate: number }
  pass: { plays: number; explosives: number; rate: number }
  specialTeams: { plays: number; explosives: number; rate: number }
}

export type ExplosiveMetrics = {
  offense: ExplosiveBreakdown
  defense: ExplosiveBreakdown
}

export type NonOffensiveTdSummary = {
  defense: number
  specialTeams: number
  total: number
  rate: number
}

export type ScoringSummary = {
  pointsFor: number
  pointsAllowed: number
  pointDifferential: number
  pointsPerGame: number
  pointsAllowedPerGame: number
  nonOffensive: NonOffensiveTdSummary
}

export type RedZoneSideSummary = {
  trips: number
  touchdowns: number
  fieldGoals: number
  scores: number
  empty: number
  scoringPct: number
  touchdownPct: number
}

export type RedZoneSummary = {
  offense: RedZoneSideSummary
  defense: RedZoneSideSummary
}

export type SampleRate = {
  count: number
  sample: number
  rate: number
}

export type DefensiveSituational = {
  overall: SampleRate
  byHalf: { first: SampleRate; second: SampleRate }
  byQuarter: Record<1 | 2 | 3 | 4, SampleRate>
  byFieldZone: Record<FieldZone | 'UNKNOWN', SampleRate>
  byDown: Record<'1' | '2' | '3' | '4', SampleRate>
  byCall: {
    front: Record<string, SampleRate>
    coverage: Record<string, SampleRate>
    pressure: Record<string, SampleRate>
  }
}

export type DefensiveConversionMetrics = {
  attempts: number
  stops: number
  conversionsAllowed: number
  stopRate: number
  situational: DefensiveSituational
}

export type DefensiveTakeawayMetrics = {
  total: number
  perGame: number
  byType: TurnoverBucketCounts
  situational: DefensiveSituational
}

export type DefensiveTflMetrics = {
  total: number
  sacks: number
  perGame: number
  situational: DefensiveSituational
  byPlayer: Record<string, { tfl: number; sacks: number }>
}

export type HavocComponents = {
  tfl: number
  sacks: number
  forcedFumbles: number
  interceptions: number
  passDeflections: number
}

export type DefensiveHavocMetrics = {
  plays: number
  havocPlays: number
  rate: number
  situational: DefensiveSituational
  components: HavocComponents
}

export type DefensiveDriveMetrics = {
  drivesFaced: number
  threeAndOuts: { count: number; rate: number }
  pointsAllowed: number
  pointsPerGame: number
  pointsPerDrive: number
  pointsPerPossession: number
}

export type DefensiveMetrics = {
  snaps: number
  takeaways: DefensiveTakeawayMetrics
  thirdDown: DefensiveConversionMetrics
  fourthDown: DefensiveConversionMetrics
  threeAndOuts: { count: number; rate: number; drives: number }
  tfls: DefensiveTflMetrics
  havoc: DefensiveHavocMetrics
  drives: DefensiveDriveMetrics
  redZone: RedZoneSideSummary
}

export type GameMetricSnapshot = {
  gameId?: string
  seasonId?: string | null
  opponentId?: string | null
  turnover: TurnoverSummary
  specialTeams?: SpecialTeamsMetrics
  timeouts?: TimeoutState | null
  explosives: ExplosiveMetrics
  scoring: ScoringSummary
  redZone: RedZoneSummary
  defense?: DefensiveMetrics
  boxScore?: BoxScoreReport
  efficiency: {
    yardsPerPlay: YardsPerPlaySummary
    success: SuccessSummary
    thirdDown: ConversionSummary
    fourthDown: ConversionSummary
    lateDown: ConversionSummary
  }
}

export type SeasonTrendPoint = {
  gameId?: string
  opponentId?: string | null
  value: number
}

export type SeasonAggregate = {
  games: number
  turnover: {
    averageMargin: number
    trend: SeasonTrendPoint[]
    takeawaysPerGame: number
    giveawaysPerGame: number
  }
  scoring: {
    averagePointsFor: number
    averagePointsAllowed: number
    averageDifferential: number
    trend: SeasonTrendPoint[]
  }
  explosives: {
    offenseRate: number
    defenseRate: number
    offenseRunRate: number
    offensePassRate: number
  }
  efficiency: {
    yardsPerPlay: YardsPerPlaySummary
    success: SuccessSummary
    thirdDown: ConversionSummary
    fourthDown: ConversionSummary
    lateDown: ConversionSummary
  }
  redZone: {
    offense: { scoringPct: number; tdPct: number }
    defense: { scoringPct: number; tdPct: number }
  }
  nonOffensiveTds: {
    perGame: number
    total: number
  }
  specialTeams: {
    fieldPosition: FieldPositionMetrics
    kickoffReturns: ReturnLine
    puntReturns: ReturnLine
    fieldGoals: {
      overallPct: number
      extraPointPct: number
      longestMade: number
      bands: FieldGoalSplits['bands']
    }
    punting: {
      punts: number
      gross: number
      net: number
      touchbackPct: number
      inside20Pct: number
      longest: number
      opponentAverageStart: number | null
    }
    kickoff: {
      touchbackPct: number
      opponentAverageStart: number | null
      longestReturnAllowed: number
    }
  }
  defense: {
    takeawaysPerGame: number
    takeawaysByType: TurnoverBucketCounts
    thirdDown: DefensiveConversionMetrics
    fourthDown: DefensiveConversionMetrics
    threeAndOutRate: number
    havocRate: number
    tflPerGame: number
    sackPerGame: number
    drivesFaced: number
    pointsAllowedPerGame: number
    pointsAllowedPerDrive: number
    redZone: { scoringPct: number; tdPct: number }
    situational: {
      takeaways: DefensiveSituational
      havoc: DefensiveSituational
      tfl: DefensiveSituational
    }
  }
}

export type SeasonProjection = {
  gamesModeled: number
  projectedWinRate: number
  projectedWinOut: number
  projectedConferenceWinRate: number
  projectedPlayoffRate: number
  projectedPointsPerGame: number
  projectedPointsAllowed: number
  strengthOfSchedule: number
  strengthOfRecord: number
  gameControl: number
  notes: string
}

export type DistanceBucket = 'SHORT' | 'MEDIUM' | 'LONG'

export type OffensivePlayFilter = {
  down?: number | number[]
  distanceBucket?: DistanceBucket
  fieldZone?: FieldZone | FieldZone[]
  personnelCode?: string | string[] | null
  formationId?: string | string[] | null
  playFamily?: PlayFamily | PlayFamily[]
  runConceptId?: string | string[] | null
  passConceptId?: string | string[] | null
  playAction?: boolean | null
}

export type ConversionSummary = {
  attempts: number
  conversions: number
  rate: number
}

export type SuccessSummary = {
  plays: number
  successes: number
  rate: number
}

export type YardsPerPlaySummary = {
  plays: number
  yards: number
  ypp: number
}

export type DriveResultBreakdown = Record<DriveResultType | 'OTHER', number>

export type PossessionMetrics = {
  offense: {
    drives: number
    timeOfPossessionSeconds: number
    firstHalfSeconds: number
    secondHalfSeconds: number
    averagePlays: number
    averageSeconds: number
    averageYards: number
    driveResults: DriveResultBreakdown
    pointsPerPossession: number
  }
  defense: {
    drives: number
    pointsPerPossession: number
  }
}

export type PassingLine = {
  attempts: number
  completions: number
  completionPct: number
  accuracyPct: number
  yards: number
  yardsPerAttempt: number
  yardsPerCompletion: number
  sacks: number
  sackYards: number
  dropbacks: number
  netYardsPerAttempt: number
}

export type PassingEfficiency = PassingLine & {
  byQuarterback: Record<string, PassingLine>
}

export type RushingLine = {
  attempts: number
  yards: number
  yardsPerCarry: number
}

export type RushingEfficiency = RushingLine & {
  byRusher: Record<string, RushingLine>
}

export type FieldPositionMetrics = {
  offenseStart: number | null
  defenseStart: number | null
  netStart: number | null
}

export type ReturnLine = {
  returns: number
  yards: number
  average: number
  longest: number
  touchdowns: number
}

export type ReturnMetrics = {
  team: ReturnLine
  byReturner: Record<string, ReturnLine>
}

export type FieldGoalBand = {
  attempts: number
  made: number
  pct: number
}

export type FieldGoalSplits = {
  overall: FieldGoalBand
  bands: {
    inside30: FieldGoalBand
    from30to39: FieldGoalBand
    from40to49: FieldGoalBand
    from50Plus: FieldGoalBand
  }
  extraPoint: FieldGoalBand
  longestMade: number
}

export type FieldGoalMetrics = FieldGoalSplits & {
  byKicker: Record<string, FieldGoalSplits>
}

export type PuntingLine = {
  punts: number
  yards: number
  gross: number
  touchbacks: number
  inside20: number
  net: number
  longest: number
  opponentAverageStart: number | null
}

export type PuntingMetrics = {
  team: PuntingLine
  byPunter: Record<string, PuntingLine>
}

export type KickoffMetrics = {
  kicks: number
  touchbacks: number
  touchbackPct: number
  opponentAverageStart: number | null
  longestReturnAllowed: number
}

export type CoverageReturnMetrics = {
  attempts: number
  yards: number
  average: number
  longest: number
  touchdownsAllowed: number
}

export type SpecialTeamsMetrics = {
  fieldPosition: FieldPositionMetrics
  kickoffReturns: ReturnMetrics
  puntReturns: ReturnMetrics
  coverage: {
    kickoff: CoverageReturnMetrics
    punt: CoverageReturnMetrics
  }
  fieldGoals: FieldGoalMetrics
  punting: PuntingMetrics
  kickoff: KickoffMetrics
}

export type ExpectedPointsInput = {
  down: number | null
  distance: number | null
  yardLine: number | null
  clockSecondsRemaining: number | null
  scoreDiff: number
  offenseTimeouts: number | null
  defenseTimeouts: number | null
}

export type ExpectedPointsResult = {
  points: number
  components: {
    baseFieldPosition: number
    conversionProbability: number
    turnoverPenalty: number
    tempoAdjustment: number
    timeoutAdjustment: number
  }
}

export type PlayEpaResult = {
  playId: string
  raw: number
  adjusted: number
  preEp: number
  postEp: number
  points: number
  unit: ChartUnit
  driveNumber: number | null
  leverage: number
  possession: 'TEAM' | 'OPPONENT'
  scoreDiff: number
  secondsRemaining: number | null
  players: string[]
}

export type EpaAggregate = {
  plays: number
  total: number
  adjustedTotal: number
  perPlay: number
  perDrive: number
  byDrive: Record<string, { epa: number; adjusted: number; plays: number }>
  byPlayer: Record<string, { epa: number; adjusted: number; plays: number }>
  byUnit: Record<ChartUnit, { epa: number; adjusted: number; plays: number; perPlay: number }>
  playsDetail: Record<string, PlayEpaResult>
}

export type WinProbabilityState = {
  scoreDiff: number
  secondsRemaining: number
  yardLine: number | null
  down: number | null
  distance: number | null
  offenseTimeouts: number | null
  defenseTimeouts: number | null
  possession: ChartUnit | null
  pregameEdge?: number
}

export type WinProbabilityPoint = {
  playId: string
  winProbability: number
  wpa: number
  leverage: number
  unit: ChartUnit
  secondsRemaining: number
}

export type WinProbabilitySummary = {
  timeline: WinProbabilityPoint[]
  averageWinProbability: number
  wpaByPlayer: Record<string, number>
  wpaByUnit: Record<ChartUnit, number>
  highLeverage: WinProbabilityPoint[]
}

export type PostGameWinExpectancyInput = {
  yardsFor: number
  yardsAllowed: number
  successRateFor: number
  successRateAllowed: number
  explosivePlaysFor: number
  explosivePlaysAllowed: number
  turnoversFor: number
  turnoversAllowed: number
  avgStartFieldPosition: number | null
  penalties: number
  plays: number
}

export type PostGameWinExpectancy = {
  teamWinExpectancy: number
  opponentWinExpectancy: number
  notes: string
}

export type SpPlusLikeRatings = {
  offense: number
  defense: number
  specialTeams: number
  overall: number
  isoPpp: number
  successRate: number
  havoc: number
  epaPerPlay: number
}

export type AdjustedNetYardsPerAttempt = {
  team: number
  attempts: number
  sacks: number
  byQuarterback: Record<string, number>
}

export type QuarterbackRating = {
  quarterback: string
  plays: number
  adjustedEpa: number
  adjustedEpaPerPlay: number
  rating: number
}

export type QuarterbackRatings = {
  byQuarterback: Record<string, QuarterbackRating>
  teamRating: number
}

export type SimulatedGame = {
  opponentId: string
  opponentName?: string | null
  opponentRating: number
  isConference?: boolean
  isPlayoff?: boolean
  homeField?: 1 | 0 | -1
}

export type SeasonSimulationInput = {
  teamRating: number
  offenseRating: number
  defenseRating: number
  specialTeamsRating: number
  schedule: SimulatedGame[]
  iterations?: number
  seed?: number
}

export type SeasonSimulationResult = {
  winProbability: number
  expectedWins: number
  winOutProbability: number
  conferenceWinProbability: number
  playoffProbability: number
  strengthOfSchedule: number
  strengthOfRecord: number
  gameControl: number
  gameResults: { opponentId: string; winRate: number }[]
}

export type GameControlMetric = {
  averageLeadWinProb: number
  timeLedPct: number
  dominationIndex: number
}
