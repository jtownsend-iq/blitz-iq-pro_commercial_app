import Link from 'next/link'
import { login } from '@/app/auth-actions'
import { Alert } from '@/components/ui/Alert'
import { CTAButton } from '@/components/ui/CTAButton'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { InputField } from '@/components/ui/InputField'

export type LoginCardProps = {
  redirectTo: string
  errorMessage?: string | null
  infoMessage?: string | null
}

export function LoginCard({ redirectTo, errorMessage, infoMessage }: LoginCardProps) {
  return (
    <Card padding="lg" tone="muted" className="max-w-lg w-full">
      <CardHeader className="flex-col items-start gap-2">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-400">BlitzIQ Pro Access</p>
        <div>
          <CardTitle>Sign in to BlitzIQ Pro</CardTitle>
          <CardDescription>Access your program&apos;s film, analytics, and Friday night intel.</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMessage ? <Alert variant="warning" description={errorMessage} /> : null}
        {infoMessage && !errorMessage ? <Alert variant="success" description={infoMessage} /> : null}

        <form className="space-y-4" action={login}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <InputField
            label="Email"
            name="email"
            type="email"
            description="Use your staff email."
            autoComplete="email"
            required
          />

          <InputField
            label="Password"
            name="password"
            type="password"
            description="Never shared or stored in logs."
            autoComplete="current-password"
            required
          />

          <CTAButton type="submit" variant="primary" fullWidth>
            Enter BlitzIQ Pro
          </CTAButton>
        </form>
      </CardContent>

      <CardFooter className="text-[0.85rem] text-slate-400">
        <Link
          href="/signup"
          className="rounded-full px-2 py-1 font-semibold text-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand/60"
        >
          Request access
        </Link>
        <span className="text-slate-500">Having trouble signing in? Contact your program admin.</span>
      </CardFooter>
    </Card>
  )
}
