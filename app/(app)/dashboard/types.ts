export type TeamRow = {
  id: string
  name: string | null
  level: string | null
  school_name: string | null
}

export type TeamMemberRow = {
  team_id: string
  role: string | null
}

export type SessionSummaryGame = {
  opponent_name: string | null
  start_time: string | null
  home_or_away?: string | null
  location?: string | null
  status?: string | null
  season_label?: string | null
}

export type SessionSummary = {
  id: string
  unit: string
  status: string
  started_at: string | null
  game_id: string
  games: SessionSummaryGame | null
}

export type SessionRow = {
  id: string
  unit: string
  status: string
  started_at: string | null
  game_id: string
  games: SessionSummaryGame | SessionSummaryGame[] | null
}

export type GameListRow = {
  id: string
  opponent_name: string | null
  start_time: string | null
  home_or_away: string | null
  location: string | null
  status: string | null
  season_label: string | null
}

export type EventSummarySession = {
  unit: string | null
  game_id: string | null
}

export type EventSummary = {
  id: string
  sequence: number
  play_call: string | null
  result: string | null
  gained_yards: number | null
  explosive: boolean | null
  turnover: boolean | null
  created_at: string | null
  game_sessions: EventSummarySession | null
}

export type EventRow = {
  id: string
  sequence: number
  play_call: string | null
  result: string | null
  gained_yards: number | null
  explosive: boolean | null
  turnover: boolean | null
  created_at: string | null
  game_sessions: EventSummarySession | EventSummarySession[] | null
}

export type DashboardCounts = {
  totalPlays: number
  explosivePlays: number
  turnovers: number
  activeSessions: number
}

export type SparkPoint = {
  index: number
  value: number
}
