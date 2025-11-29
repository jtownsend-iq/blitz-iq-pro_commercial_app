'use server'

const isTest =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.JEST_WORKER_ID !== undefined

function readEnv(key: string, { optional = false }: { optional?: boolean } = {}): string | undefined {
  const value = process.env[key]
  if (!value && !optional && !isTest) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  supabaseUrl: readEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),

  stripePublishableKey: readEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', { optional: true }),
  stripeSecretKey: readEnv('STRIPE_SECRET_KEY', { optional: true }),
  stripePriceStandard: readEnv('STRIPE_PRICE_STANDARD', { optional: true }),
  stripePriceElite: readEnv('STRIPE_PRICE_ELITE', { optional: true }),

  telemetryVerifyToken: readEnv('TELEMETRY_VERIFY_TOKEN', { optional: true }),

  openaiApiKey: readEnv('OPENAI_API_KEY', { optional: true }),
} as const
