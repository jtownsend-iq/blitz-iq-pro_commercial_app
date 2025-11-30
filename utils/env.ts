export type Env = {
  supabaseUrl: string | undefined
  supabaseAnonKey: string | undefined
  supabaseServiceRoleKey: string | undefined
  stripePublishableKey: string | undefined
  stripeSecretKey: string | undefined
  stripePriceStandard: string | undefined
  stripePriceElite: string | undefined
  telemetryVerifyToken: string | undefined
  openaiApiKey: string | undefined
}

function isTestEnv(vars: NodeJS.ProcessEnv) {
  return (
    vars.NODE_ENV === 'test' ||
    vars.VITEST === 'true' ||
    vars.JEST_WORKER_ID !== undefined
  )
}

function readEnv(
  key: string,
  vars: NodeJS.ProcessEnv,
  { optional = false, allowMissingInTest = true }: { optional?: boolean; allowMissingInTest?: boolean } = {}
): string | undefined {
  const value = vars[key]
  const inTest = isTestEnv(vars)
  if (!value && !optional && !(allowMissingInTest && inTest)) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export function buildEnv(vars: NodeJS.ProcessEnv, opts: { allowMissingInTest?: boolean } = {}): Env {
  const { allowMissingInTest = true } = opts
  return {
    supabaseUrl: readEnv('NEXT_PUBLIC_SUPABASE_URL', vars, { allowMissingInTest }),
    supabaseAnonKey:
      readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', vars, { allowMissingInTest, optional: true }) ??
      readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', vars, { allowMissingInTest }),
    supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY', vars, { allowMissingInTest }),
    stripePublishableKey: readEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', vars, { optional: true, allowMissingInTest }),
    stripeSecretKey: readEnv('STRIPE_SECRET_KEY', vars, { optional: true, allowMissingInTest }),
    stripePriceStandard: readEnv('STRIPE_PRICE_STANDARD', vars, { optional: true, allowMissingInTest }),
    stripePriceElite: readEnv('STRIPE_PRICE_ELITE', vars, { optional: true, allowMissingInTest }),
    telemetryVerifyToken: readEnv('TELEMETRY_VERIFY_TOKEN', vars, { optional: true, allowMissingInTest }),
    openaiApiKey: readEnv('OPENAI_API_KEY', vars, { optional: true, allowMissingInTest }),
  }
}

export const env = buildEnv(process.env)
