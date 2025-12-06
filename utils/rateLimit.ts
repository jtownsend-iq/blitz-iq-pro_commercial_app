type Clock = () => number

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export interface RateLimitStore {
  consume(key: string, points: number, windowMs: number): RateLimitResult
}

class MemoryRateLimitStore implements RateLimitStore {
  private buckets: Map<string, { tokens: number; resetAt: number }> = new Map()
  private now: Clock

  constructor(now: Clock = () => Date.now()) {
    this.now = now
  }

  consume(key: string, points: number, windowMs: number): RateLimitResult {
    const current = this.buckets.get(key)
    const now = this.now()

    if (!current || now > current.resetAt) {
      const resetAt = now + windowMs
      this.buckets.set(key, { tokens: Math.max(points - 1, 0), resetAt })
      return { allowed: true, remaining: Math.max(points - 1, 0), resetAt }
    }

    if (current.tokens <= 0) {
      return { allowed: false, remaining: 0, resetAt: current.resetAt }
    }

    const remaining = current.tokens - 1
    this.buckets.set(key, { tokens: remaining, resetAt: current.resetAt })
    return { allowed: true, remaining, resetAt: current.resetAt }
  }
}

type RateLimiterOptions = {
  points: number
  windowMs: number
  store?: RateLimitStore
}

export class RateLimiter {
  private readonly points: number
  private readonly windowMs: number
  private readonly store: RateLimitStore

  constructor(options: RateLimiterOptions) {
    this.points = options.points
    this.windowMs = options.windowMs
    this.store = options.store ?? new MemoryRateLimitStore()
  }

  check(key: string): RateLimitResult {
    return this.store.consume(key, this.points, this.windowMs)
  }
}

export function createTenantRateLimiter(points: number, windowMs: number, store?: RateLimitStore) {
  const limiter = new RateLimiter({ points, windowMs, store })
  return {
    async guard(key: string) {
      const result = limiter.check(key)
      if (!result.allowed) {
        throw Object.assign(new Error('rate_limit_exceeded'), {
          status: 429,
          retryAt: result.resetAt,
        })
      }
      return result
    },
  }
}
