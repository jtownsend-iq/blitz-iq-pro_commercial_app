import test from 'node:test'
import assert from 'node:assert/strict'
import { RateLimiter, createTenantRateLimiter } from '../../utils/rateLimit'

test('RateLimiter enforces window budget per key', () => {
  const limiter = new RateLimiter({ points: 2, windowMs: 10_000 })
  const first = limiter.check('team-1')
  assert.equal(first.allowed, true)
  assert.equal(first.remaining, 1)

  const second = limiter.check('team-1')
  assert.equal(second.allowed, true)
  assert.equal(second.remaining, 0)

  const third = limiter.check('team-1')
  assert.equal(third.allowed, false)
  assert.equal(third.remaining, 0)
})

test('createTenantRateLimiter throws with 429 metadata when exceeded', async () => {
  const limiter = createTenantRateLimiter(1, 50_000)
  await limiter.guard('tenant-123')

  await assert.rejects(
    limiter.guard('tenant-123'),
    (err: unknown) => {
      const e = err as { status?: unknown; retryAt?: unknown }
      return e instanceof Error && e.status === 429 && typeof e.retryAt === 'number'
    }
  )
})
