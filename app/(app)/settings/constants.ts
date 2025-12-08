export const notificationToggleFields = [
  'notify_ai_email',
  'notify_ai_sms',
  'notify_ai_push',
  'notify_reports_email',
  'notify_reports_sms',
  'notify_reports_push',
  'notify_billing_email',
  'notify_billing_sms',
  'notify_billing_push',
] as const

export type NotificationToggleKey = (typeof notificationToggleFields)[number]

export const STAFF_ROLE_VALUES = [
  'OWNER',
  'ADMIN',
  'HEAD_COACH',
  'COORDINATOR',
  'POSITION_COACH',
  'ANALYST',
  'IT_ADMIN',
] as const

export const STAFF_ROLE_ASSIGNABLE_VALUES = [
  'ADMIN',
  'HEAD_COACH',
  'COORDINATOR',
  'POSITION_COACH',
  'ANALYST',
  'IT_ADMIN',
] as const

export const STAFF_ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Program Admin' },
  { value: 'HEAD_COACH', label: 'Head Coach' },
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: 'POSITION_COACH', label: 'Position Coach' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'IT_ADMIN', label: 'IT / Ops' },
] as const

export type StaffRoleValue = (typeof STAFF_ROLE_VALUES)[number]

export const TEAM_MANAGER_ROLES = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COORDINATOR'] as const

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/
export const FALLBACK_PRIMARY_COLOR = '#F97316'

export const POSITIONAL_GROUP_DEFAULTS = [
  { group: 'Offense', units: ['QB', 'RB', 'WR', 'TE', 'OL'] },
  { group: 'Defense', units: ['DL', 'LB', 'CB', 'S'] },
  { group: 'Specialists', units: ['K', 'P', 'LS', 'KR/PR'] },
] as const

export const DEFAULT_PERSONNEL_TAGS = ['11', '12', '20', '21', '10'] as const
export const DEFAULT_FORMATION_TAGS = ['Trips Right', 'Trey Left', 'Bunch', 'Empty'] as const
export const DEFAULT_CUSTOM_TAGS: string[] = []

export const DEFAULT_EXPLOSIVE_THRESHOLDS = {
  run: 12,
  pass: 18,
} as const

export const DEFAULT_SUCCESS_THRESHOLDS = {
  firstDownYards: 4,
  secondDownPct: 70,
  thirdDownPct: 60,
  fourthDownPct: 60,
} as const

export const DEFAULT_BASE_STRUCTURES = {
  offensePersonnel: ['11', '12', '20', '21', '10'],
  offenseFormations: ['Trips Right', 'Trey Left', 'Bunch', 'Empty', 'Y-Off Tight'],
  defenseFronts: ['Mint', 'Even', 'Odd', 'Under', 'Bear'],
  coverages: ['Quarters', 'Cover 3 Match', 'Cover 1 Robber', 'Cover 2', 'Cover 6'],
  specialFormations: ['Punt Shield', 'Kickoff Left/Right', 'PAT/FG', 'Hands Team'],
  specialCalls: ['Sky Kick', 'Onside Alert', 'Fake Punt', 'Pooch Kick'],
} as const

export const DICTIONARY_CATEGORIES = [
  { id: 'OFFENSE_FORMATION', label: 'Offensive formations' },
  { id: 'OFFENSE_PERSONNEL', label: 'Offensive personnel' },
  { id: 'RUN_CONCEPT', label: 'Run concepts' },
  { id: 'PASS_CONCEPT', label: 'Pass concepts' },
  { id: 'DEFENSE_FRONT', label: 'Defensive fronts' },
  { id: 'COVERAGE', label: 'Coverages' },
  { id: 'PRESSURE', label: 'Pressures' },
  { id: 'SPECIAL_TEAMS_PLAY', label: 'Special teams plays' },
] as const

export const DICTIONARY_STATUS = ['active', 'deprecated'] as const

export type DictionaryCategory = (typeof DICTIONARY_CATEGORIES)[number]['id']
