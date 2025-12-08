import { DEFAULT_BASE_STRUCTURES, DEFAULT_EXPLOSIVE_THRESHOLDS, DictionaryCategory } from '@/app/(app)/settings/constants'
import { createSupabaseServerClient } from '@/utils/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type TeamSeasonContext = {
  seasonYear: number | null
  seasonLabel: string | null
  timezone: string | null
}

export type AnalyticsPreferences = {
  explosiveRun: number
  explosivePass: number
  includeTurnoverOnDowns: boolean
}

export type TeamPreferences = {
  baseOffPersonnel: string[]
  baseOffFormations: string[]
  baseDefFronts: string[]
  baseCoverages: string[]
  baseSpecialFormations: string[]
  baseSpecialCalls: string[]
  analytics: AnalyticsPreferences
  useCustomExplosives: boolean
  aiSuggestionAggressiveness: number
  statsPanelDensity: 'compact' | 'balanced' | 'dense'
  hudlMapping: Record<string, string>
  csvMapping: Record<string, string>
}

export type DictionaryItem = {
  id: string
  category: DictionaryCategory
  label: string
  code: string | null
  status: 'active' | 'deprecated'
  description: string | null
  sort_order: number
  season_year: number | null
}

export async function loadTeamSeasonContext(supabase: SupabaseClient, teamId: string): Promise<TeamSeasonContext> {
  const seasonContext: TeamSeasonContext = {
    seasonYear: null,
    seasonLabel: null,
    timezone: 'UTC',
  }

  const { data: settings } = await supabase
    .from('team_settings')
    .select('default_season_year, default_timezone')
    .eq('team_id', teamId)
    .maybeSingle()

  if (settings?.default_timezone) {
    seasonContext.timezone = settings.default_timezone as string
  }

  if (typeof settings?.default_season_year === 'number') {
    seasonContext.seasonYear = settings.default_season_year as number
    const { data: seasonRow } = await supabase
      .from('seasons')
      .select('label')
      .eq('team_id', teamId)
      .eq('year', settings.default_season_year)
      .maybeSingle()

    seasonContext.seasonLabel = (seasonRow?.label as string | null) ?? null
  }

  return seasonContext
}

export async function loadTeamPreferences(supabase: SupabaseClient, teamId: string): Promise<TeamPreferences> {
  const [{ data: prefRow }, { data: chartDefaults }] = await Promise.all([
    supabase
      .from('team_preferences')
      .select(
        'base_off_personnel, base_off_formations, base_def_fronts, base_coverages, base_special_formations, base_special_calls, include_turnover_on_downs, ai_suggestion_aggressiveness, stats_panel_density, hudl_mapping, csv_mapping, use_custom_explosives'
      )
      .eq('team_id', teamId)
      .maybeSingle(),
    supabase
      .from('charting_defaults')
      .select('explosive_run_threshold, explosive_pass_threshold')
      .eq('team_id', teamId)
      .maybeSingle(),
  ])

  const baseOffPersonnel =
    (prefRow?.base_off_personnel as string[] | null) ?? [...DEFAULT_BASE_STRUCTURES.offensePersonnel]
  const baseOffFormations =
    (prefRow?.base_off_formations as string[] | null) ?? [...DEFAULT_BASE_STRUCTURES.offenseFormations]
  const baseDefFronts = (prefRow?.base_def_fronts as string[] | null) ?? [...DEFAULT_BASE_STRUCTURES.defenseFronts]
  const baseCoverages = (prefRow?.base_coverages as string[] | null) ?? [...DEFAULT_BASE_STRUCTURES.coverages]
  const baseSpecialFormations =
    (prefRow?.base_special_formations as string[] | null) ?? [...DEFAULT_BASE_STRUCTURES.specialFormations]
  const baseSpecialCalls =
    (prefRow?.base_special_calls as string[] | null) ?? [...DEFAULT_BASE_STRUCTURES.specialCalls]

  const explosiveRun = typeof chartDefaults?.explosive_run_threshold === 'number'
    ? chartDefaults.explosive_run_threshold
    : DEFAULT_EXPLOSIVE_THRESHOLDS.run
  const explosivePass = typeof chartDefaults?.explosive_pass_threshold === 'number'
    ? chartDefaults.explosive_pass_threshold
    : DEFAULT_EXPLOSIVE_THRESHOLDS.pass

  const includeTurnoverOnDowns =
    prefRow?.include_turnover_on_downs == null ? true : Boolean(prefRow.include_turnover_on_downs)

  return {
    baseOffPersonnel,
    baseOffFormations,
    baseDefFronts,
    baseCoverages,
    baseSpecialFormations,
    baseSpecialCalls,
    analytics: {
      explosiveRun,
      explosivePass,
      includeTurnoverOnDowns,
    },
    useCustomExplosives: Boolean(prefRow?.use_custom_explosives),
    aiSuggestionAggressiveness:
      typeof prefRow?.ai_suggestion_aggressiveness === 'number'
        ? prefRow.ai_suggestion_aggressiveness
        : 50,
    statsPanelDensity:
      (prefRow?.stats_panel_density as TeamPreferences['statsPanelDensity'] | null) ?? 'balanced',
    hudlMapping: (prefRow?.hudl_mapping as Record<string, string> | null) ?? {},
    csvMapping: (prefRow?.csv_mapping as Record<string, string> | null) ?? {},
  }
}

export async function loadDataDictionaries(
  supabase: SupabaseClient,
  teamId: string
): Promise<DictionaryItem[]> {
  const { data } = await supabase
    .from('data_dictionary_items')
    .select('id, category, label, code, status, description, sort_order, season_year')
    .eq('team_id', teamId)
    .order('sort_order', { ascending: true })

  return (data as DictionaryItem[] | null) ?? []
}
