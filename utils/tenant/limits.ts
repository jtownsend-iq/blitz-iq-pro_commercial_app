import { createTenantRateLimiter } from '@/utils/rateLimit'
import { sendServerTelemetry } from '@/utils/telemetry.server'
import type { TenantContext } from './context'

type TierQuota = {
  points: number
  windowMs: number
}

type TierQuotaMap = Record<string, TierQuota>

const DEFAULT_QUOTAS: Record<string, TierQuotaMap> = {
  standard: {
    default: { points: 300, windowMs: 60_000 },
    write: { points: 120, windowMs: 60_000 },
    ingest: { points: 40, windowMs: 60_000 },
  },
  elite: {
    default: { points: 500, windowMs: 60_000 },
    write: { points: 200, windowMs: 60_000 },
    ingest: { points: 80, windowMs: 60_000 },
  },
}

const limiterCache = new Map<string, ReturnType<typeof createTenantRateLimiter>>()

function resolveQuota(tier: string | null | undefined, actionKey: string): TierQuota {
  const normalizedTier = (tier || 'standard').toLowerCase()
  const tierConfig = DEFAULT_QUOTAS[normalizedTier] ?? DEFAULT_QUOTAS.standard
  return tierConfig[actionKey] ?? tierConfig.default
}

function getLimiter(cacheKey: string, quota: TierQuota) {
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!
  const limiter = createTenantRateLimiter(quota.points, quota.windowMs)
  limiterCache.set(cacheKey, limiter)
  return limiter
}

export async function guardTenantAction(
  tenant: TenantContext,
  actionKey: string,
  override?: Partial<TierQuota>
) {
  const quota = { ...resolveQuota(tenant.teamTier, actionKey), ...(override || {}) }
  const limiter = getLimiter(`${actionKey}:${quota.points}:${quota.windowMs}`, quota)
  try {
    return await limiter.guard(`team:${tenant.teamId}:${actionKey}`)
  } catch (err) {
    void sendServerTelemetry(
      'rate_limit_hit',
      {
        action: actionKey,
        windowMs: quota.windowMs,
        points: quota.points,
      },
      { teamId: tenant.teamId, userId: tenant.userId, tier: tenant.teamTier ?? 'standard' }
    )
    throw err
  }
}
