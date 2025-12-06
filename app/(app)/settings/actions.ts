'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  createSupabaseServiceRoleClient,
} from '@/utils/supabase/server'
import { assertTenantRole, requireTenantContext } from '@/utils/tenant/context'
import { guardTenantAction } from '@/utils/tenant/limits'
import {
  DEFAULT_CUSTOM_TAGS,
  DEFAULT_EXPLOSIVE_THRESHOLDS,
  DEFAULT_FORMATION_TAGS,
  DEFAULT_PERSONNEL_TAGS,
  DEFAULT_SUCCESS_THRESHOLDS,
  HEX_COLOR_REGEX,
  STAFF_ROLE_ASSIGNABLE_VALUES,
  TEAM_MANAGER_ROLES,
  notificationToggleFields,
} from './constants'

const profileIdentitySchema = z.object({
  full_name: z.string().min(2, 'Name is required').max(200),
  title: z.string().max(120).optional(),
  phone_number: z.string().max(30).optional(),
})

const notificationPreferencesSchema = z.object(
  notificationToggleFields.reduce(
    (shape, field) => ({
      ...shape,
      [field]: z.boolean(),
    }),
    {} as Record<(typeof notificationToggleFields)[number], z.ZodBoolean>
  )
)

const teamBrandingSchema = z.object({
  name: z.string().min(2).max(200),
  school_name: z.string().max(200).optional(),
  level: z.string().max(120).optional(),
  primary_color: z
    .string()
    .regex(HEX_COLOR_REGEX, 'Invalid hex color')
    .optional(),
  logo_url: z
    .string()
    .url('Logo URL must be valid')
    .max(500)
    .optional()
    .or(z.literal('')),
})

const teamSeasonSchema = z.object({
  season_year: z.coerce.number().int().min(1990).max(2100),
  season_label: z.string().max(150).optional(),
})

const rosterPlayerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(120),
  last_name: z.string().min(1, 'Last name is required').max(120),
  jersey_number: z.string().max(10).optional(),
  position: z.string().max(40).optional(),
  unit: z.string().max(60).optional(),
  class_year: z.string().max(4).optional(),
})

const staffInviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(STAFF_ROLE_ASSIGNABLE_VALUES),
})

const staffRoleUpdateSchema = z.object({
  member_user_id: z.string().uuid(),
  role: z.enum(STAFF_ROLE_ASSIGNABLE_VALUES),
})

const positionGroupsSchema = z.array(
  z.object({
    id: z.string().uuid().optional(),
    group_name: z.string().min(2).max(80),
    units: z.array(z.string().min(1).max(40)).max(12),
    sort_order: z.number().int().nonnegative(),
  })
)

const chartTagListSchema = z.array(z.string().min(1).max(120)).max(100)

const chartingDefaultsSchema = z.object({
  explosive_run_threshold: z.coerce.number().int().min(0).max(120),
  explosive_pass_threshold: z.coerce.number().int().min(0).max(120),
  success_1st_yards: z.coerce.number().int().min(0).max(20),
  success_2nd_pct: z.coerce.number().int().min(0).max(100),
  success_3rd_pct: z.coerce.number().int().min(0).max(100),
  success_4th_pct: z.coerce.number().int().min(0).max(100),
})

function normalizeString(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

function parseTagList(value: FormDataEntryValue | null, fallback: string[] = []): string[] {
  const raw = typeof value === 'string' ? value : ''
  const parts = raw
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)

  const unique = Array.from(new Set(parts))
  if (unique.length === 0) return [...fallback]
  return unique.slice(0, 100)
}

function parseCheckbox(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false
  }
  return value === 'on' || value === 'true' || value === '1'
}

export async function updateProfileIdentity(formData: FormData) {
  const tenant = await requireTenantContext({ auditEvent: 'settings_update_profile' })
  await guardTenantAction(tenant, 'write')
  const supabase = tenant.supabase

  const raw = {
    full_name: normalizeString(formData.get('full_name')),
    title: normalizeString(formData.get('title')),
    phone_number: normalizeString(formData.get('phone_number')),
  }

  const parsed = profileIdentitySchema.safeParse({
    full_name: raw.full_name,
    title: raw.title || undefined,
    phone_number: raw.phone_number || undefined,
  })

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const payload = {
    full_name: parsed.data.full_name,
    title: parsed.data.title ? parsed.data.title : null,
    phone_number: parsed.data.phone_number ? parsed.data.phone_number : null,
  }

  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', tenant.userId)

  if (error) {
    console.error('updateProfileIdentity error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateNotificationPreferences(formData: FormData) {
  const tenant = await requireTenantContext({ auditEvent: 'settings_update_notifications' })
  await guardTenantAction(tenant, 'write')
  const supabase = tenant.supabase

  const rawEntries = notificationToggleFields.map((field) => [
    field,
    parseCheckbox(formData.get(field)),
  ])

  const raw = Object.fromEntries(rawEntries) as Record<
    (typeof notificationToggleFields)[number],
    boolean
  >

  const parsed = notificationPreferencesSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { error } = await supabase
    .from('users')
    .update(parsed.data)
    .eq('id', tenant.userId)

  if (error) {
    console.error('updateNotificationPreferences error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

type TeamContextUser = {
  id: string
  email: string | null
}

type TeamContext = {
  supabase: Awaited<ReturnType<typeof requireTenantContext>>['supabase']
  user: TeamContextUser
  teamId: string
  role: string | null
}

async function requireTeamManager(auditEvent = 'settings_action'): Promise<TeamContext> {
  const tenant = await requireTenantContext({ auditEvent })
  assertTenantRole(tenant, TEAM_MANAGER_ROLES, auditEvent)
  await guardTenantAction(tenant, 'write')
  return {
    supabase: tenant.supabase,
    user: { id: tenant.userId, email: tenant.email ?? null },
    teamId: tenant.teamId,
    role: tenant.membershipRole ?? null,
  }
}

export async function updateTeamBranding(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const raw = {
    name: normalizeString(formData.get('team_name')),
    school_name: normalizeString(formData.get('school_name')),
    level: normalizeString(formData.get('team_level')),
    primary_color: normalizeString(formData.get('primary_color')),
    logo_url: normalizeString(formData.get('logo_url')),
  }

  const parsed = teamBrandingSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const payload = {
    name: parsed.data.name,
    school_name: parsed.data.school_name || null,
    level: parsed.data.level || null,
    primary_color: parsed.data.primary_color || null,
    logo_url: parsed.data.logo_url ? parsed.data.logo_url : null,
  }

  const { error } = await serviceClient.from('teams').update(payload).eq('id', teamId)

  if (error) {
    console.error('updateTeamBranding error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateSeasonMetadata(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const raw = {
    season_year: normalizeString(formData.get('season_year')),
    season_label: normalizeString(formData.get('season_label')),
  }

  const parsed = teamSeasonSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const seasonYear = parsed.data.season_year
  const seasonLabel = parsed.data.season_label || null

  const { error: settingsError } = await serviceClient
    .from('team_settings')
    .upsert(
      { team_id: teamId, default_season_year: seasonYear },
      {
        onConflict: 'team_id',
      }
    )

  if (settingsError) {
    console.error('updateSeasonMetadata upsert settings error:', settingsError.message)
    return { success: false, error: 'server_error' }
  }

  if (seasonLabel) {
    const { error: seasonError } = await serviceClient
      .from('seasons')
      .upsert(
        {
          team_id: teamId,
          year: seasonYear,
          label: seasonLabel,
        },
        {
          onConflict: 'team_id,year',
        }
      )

    if (seasonError) {
      console.error('updateSeasonMetadata season upsert error:', seasonError.message)
      return { success: false, error: 'server_error' }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function addRosterPlayer(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const raw = {
    first_name: normalizeString(formData.get('first_name')),
    last_name: normalizeString(formData.get('last_name')),
    jersey_number: normalizeString(formData.get('jersey_number')),
    position: normalizeString(formData.get('position')),
    unit: normalizeString(formData.get('unit')),
    class_year: normalizeString(formData.get('class_year')),
  }

  const parsed = rosterPlayerSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const classYearString = parsed.data.class_year
  let classYear: number | null = null

  if (classYearString) {
    const coerced = Number(classYearString)
    if (Number.isNaN(coerced) || coerced < 1990 || coerced > 2100) {
      return { success: false, error: 'invalid_input' }
    }
    classYear = coerced
  }

  const payload = {
    team_id: teamId,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    jersey_number: parsed.data.jersey_number || null,
    position: parsed.data.position || null,
    unit: parsed.data.unit || null,
    class_year: classYear,
  }

  const { error } = await serviceClient.from('players').insert(payload)

  if (error) {
    console.error('addRosterPlayer error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function removeRosterPlayer(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const playerId = normalizeString(formData.get('player_id'))

  if (!playerId) {
    return { success: false, error: 'invalid_input' }
  }

  const serviceClient = createSupabaseServiceRoleClient()

  const { error } = await serviceClient
    .from('players')
    .delete()
    .eq('team_id', teamId)
    .eq('id', playerId)

  if (error) {
    console.error('removeRosterPlayer error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function savePositionGroups(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const keys = formData
    .getAll('group_keys')
    .map((value) => value?.toString().trim())
    .filter((value): value is string => Boolean(value))

  const groupPayload = keys
    .map((key, index) => {
      const name = normalizeString(formData.get(`group_name_${key}`))
      const unitsRaw = normalizeString(formData.get(`group_units_${key}`))
      const id = normalizeString(formData.get(`group_id_${key}`))

      if (!name) {
        return null
      }

      const units =
        unitsRaw.length > 0
          ? unitsRaw
              .split(',')
              .map((unit) => unit.trim())
              .filter(Boolean)
          : []

      return {
        id: id || undefined,
        group_name: name,
        units,
        sort_order: index,
      }
    })
    .filter(Boolean) as Array<z.infer<typeof positionGroupsSchema>[number]>

  if (groupPayload.length === 0) {
    await serviceClient.from('team_position_groups').delete().eq('team_id', teamId)
    revalidatePath('/settings')
    return { success: true }
  }

  const parsed = positionGroupsSchema.safeParse(groupPayload)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const existingBefore = await serviceClient
    .from('team_position_groups')
    .select('id')
    .eq('team_id', teamId)

  const keepIds = parsed.data
    .map((group) => group.id)
    .filter((value): value is string => Boolean(value))

  const payload = parsed.data.map((group) => ({
    id: group.id || undefined,
    team_id: teamId,
    group_name: group.group_name,
    units: group.units,
    sort_order: group.sort_order,
  }))

  const upsertResult = await serviceClient
    .from('team_position_groups')
    .upsert(payload, { onConflict: 'team_id,group_name' })

  if (upsertResult.error) {
    console.error('savePositionGroups upsert error:', upsertResult.error.message)
    return { success: false, error: 'server_error' }
  }

  if (!existingBefore.error && existingBefore.data) {
    const idsToDelete = existingBefore.data
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id && !keepIds.includes(id)))

    if (idsToDelete.length > 0) {
      await serviceClient.from('team_position_groups').delete().in('id', idsToDelete)
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function inviteStaffMember(formData: FormData) {
  const { teamId, user } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const raw = {
    email: normalizeString(formData.get('invite_email')).toLowerCase(),
    role: normalizeString(formData.get('invite_role')).toUpperCase(),
  }

  const parsed = staffInviteSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const email = parsed.data.email.toLowerCase()
  const role = parsed.data.role

  // Prevent duplicate pending invites
  const { data: existingInvite } = await serviceClient
    .from('team_invites')
    .select('id')
    .eq('team_id', teamId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite) {
    return { success: false, error: 'invite_exists' }
  }

  // If user already exists and is part of team, skip
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    const { data: membership } = await serviceClient
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (membership) {
      return { success: false, error: 'already_member' }
    }
  }

  const token = randomUUID()

  const { error } = await serviceClient.from('team_invites').insert({
    team_id: teamId,
    email,
    role,
    invited_by: user.id,
    status: 'pending',
    token,
  })

  if (error) {
    console.error('inviteStaffMember error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function cancelStaffInvite(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const inviteId = normalizeString(formData.get('invite_id'))

  if (!inviteId) {
    return { success: false, error: 'invalid_input' }
  }

  const serviceClient = createSupabaseServiceRoleClient()

  const { error } = await serviceClient
    .from('team_invites')
    .update({ status: 'cancelled' })
    .eq('team_id', teamId)
    .eq('id', inviteId)

  if (error) {
    console.error('cancelStaffInvite error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateStaffRole(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const raw = {
    member_user_id: normalizeString(formData.get('member_user_id')),
    role: normalizeString(formData.get('role')).toUpperCase(),
  }

  const parsed = staffRoleUpdateSchema.safeParse(raw)

  if (!parsed.success) {
    return { success: false, error: 'invalid_input' }
  }

  const { error } = await serviceClient
    .from('team_members')
    .update({ role: parsed.data.role })
    .eq('team_id', teamId)
    .eq('user_id', parsed.data.member_user_id)

  if (error) {
    console.error('updateStaffRole error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function removeStaffMember(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const memberUserId = normalizeString(formData.get('member_user_id'))

  if (!memberUserId) {
    return { success: false, error: 'invalid_input' }
  }

  const serviceClient = createSupabaseServiceRoleClient()

  const { error } = await serviceClient
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', memberUserId)

  if (error) {
    console.error('removeStaffMember error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function saveDefaultChartTags(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const mode = normalizeString(formData.get('mode'))
  const restoreDefaults = mode === 'restore'

  const personnelOffense = restoreDefaults
    ? [...DEFAULT_PERSONNEL_TAGS]
    : parseTagList(formData.get('personnel_offense'), [...DEFAULT_PERSONNEL_TAGS])
  const personnelDefense = restoreDefaults
    ? []
    : parseTagList(formData.get('personnel_defense'), [])
  const formationsOffense = restoreDefaults
    ? [...DEFAULT_FORMATION_TAGS]
    : parseTagList(formData.get('formations_offense'), [...DEFAULT_FORMATION_TAGS])
  const formationsDefense = restoreDefaults ? [] : parseTagList(formData.get('formations_defense'), [])
  const customTags = restoreDefaults
    ? [...DEFAULT_CUSTOM_TAGS]
    : parseTagList(formData.get('custom_tags'), [...DEFAULT_CUSTOM_TAGS])

  const listsToValidate = [
    personnelOffense,
    personnelDefense,
    formationsOffense,
    formationsDefense,
    customTags,
  ]

  if (listsToValidate.some((list) => !chartTagListSchema.safeParse(list).success)) {
    return { success: false, error: 'invalid_input' }
  }

  const rows: Array<{
    label: string
    category: 'PERSONNEL' | 'FORMATION' | 'CUSTOM'
    unit: string | null
    sort_order: number
    context: string
  }> = []

  personnelOffense.forEach((label, idx) => {
    rows.push({
      label,
      category: 'PERSONNEL',
      unit: 'OFFENSE',
      sort_order: idx,
      context: 'DEFAULTS',
    })
  })

  personnelDefense.forEach((label, idx) => {
    rows.push({
      label,
      category: 'PERSONNEL',
      unit: 'DEFENSE',
      sort_order: idx,
      context: 'DEFAULTS',
    })
  })

  formationsOffense.forEach((label, idx) => {
    rows.push({
      label,
      category: 'FORMATION',
      unit: 'OFFENSE',
      sort_order: idx,
      context: 'DEFAULTS',
    })
  })

  formationsDefense.forEach((label, idx) => {
    rows.push({
      label,
      category: 'FORMATION',
      unit: 'DEFENSE',
      sort_order: idx,
      context: 'DEFAULTS',
    })
  })

  customTags.forEach((label, idx) => {
    rows.push({
      label,
      category: 'CUSTOM',
      unit: null,
      sort_order: idx,
      context: 'DEFAULTS',
    })
  })

  const { error: deleteError } = await serviceClient
    .from('chart_tags')
    .delete()
    .eq('team_id', teamId)
    .eq('context', 'DEFAULTS')
    .in('category', ['PERSONNEL', 'FORMATION', 'CUSTOM'])

  if (deleteError) {
    console.error('saveDefaultChartTags delete error:', deleteError.message)
    return { success: false, error: 'server_error' }
  }

  if (rows.length > 0) {
    const { error: insertError } = await serviceClient.from('chart_tags').insert(
      rows.map((row) => ({
        team_id: teamId,
        label: row.label,
        category: row.category,
        unit: row.unit,
        sort_order: row.sort_order,
        context: row.context,
      }))
    )

    if (insertError) {
      console.error('saveDefaultChartTags insert error:', insertError.message)
      return { success: false, error: 'server_error' }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function saveChartingThresholds(formData: FormData) {
  const { teamId } = await requireTeamManager()
  const serviceClient = createSupabaseServiceRoleClient()

  const restoreDefaults = normalizeString(formData.get('mode')) === 'restore'

  const raw = {
    explosive_run_threshold: formData.get('explosive_run_threshold'),
    explosive_pass_threshold: formData.get('explosive_pass_threshold'),
    success_1st_yards: formData.get('success_1st_yards'),
    success_2nd_pct: formData.get('success_2nd_pct'),
    success_3rd_pct: formData.get('success_3rd_pct'),
    success_4th_pct: formData.get('success_4th_pct'),
  }

  const parsedPayload = chartingDefaultsSchema.safeParse(raw)

  if (!restoreDefaults && !parsedPayload.success) {
    return { success: false, error: 'invalid_input' }
  }

  const parsed = restoreDefaults
    ? {
        explosive_run_threshold: DEFAULT_EXPLOSIVE_THRESHOLDS.run,
        explosive_pass_threshold: DEFAULT_EXPLOSIVE_THRESHOLDS.pass,
        success_1st_yards: DEFAULT_SUCCESS_THRESHOLDS.firstDownYards,
        success_2nd_pct: DEFAULT_SUCCESS_THRESHOLDS.secondDownPct,
        success_3rd_pct: DEFAULT_SUCCESS_THRESHOLDS.thirdDownPct,
        success_4th_pct: DEFAULT_SUCCESS_THRESHOLDS.fourthDownPct,
      }
    : parsedPayload.success
      ? parsedPayload.data
      : undefined

  if (!parsed) {
    return { success: false, error: 'invalid_input' }
  }

  const { error } = await serviceClient
    .from('charting_defaults')
    .upsert(
      [
        {
          team_id: teamId,
          explosive_run_threshold: parsed.explosive_run_threshold,
          explosive_pass_threshold: parsed.explosive_pass_threshold,
          success_1st_yards: parsed.success_1st_yards,
          success_2nd_pct: parsed.success_2nd_pct,
          success_3rd_pct: parsed.success_3rd_pct,
          success_4th_pct: parsed.success_4th_pct,
        },
      ],
      { onConflict: 'team_id' }
    )

  if (error) {
    console.error('saveChartingThresholds upsert error:', error.message)
    return { success: false, error: 'server_error' }
  }

  revalidatePath('/settings')
  return { success: true }
}
