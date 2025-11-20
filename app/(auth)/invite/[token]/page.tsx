import Link from 'next/link'
import { redirect } from 'next/navigation'
import { acceptInvite } from '../actions'
import { createSupabaseServerClient } from '@/utils/supabase/server'

type InviteRow = {
  team_id: string
  email: string | null
  role: string | null
  status: string | null
  expires_at: string | null
  teams:
    | {
        name: string | null
      }
    | { name: any }[]
    | null
}

type InvitePageProps = {
  params: { token: string }
  searchParams?: { error?: string }
}

function normalizeEmail(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: invite, error } = await supabase
    .from('team_invites')
    .select('team_id, email, role, status, expires_at, teams ( name )')
    .eq('token', params.token)
    .maybeSingle()

  if (error) {
    console.error('Invite lookup error:', error.message)
  }

  const invalid = !invite
  const now = Date.now()
  const expiresAt = invite?.expires_at ? new Date(invite.expires_at).getTime() : 0
  const expired = expiresAt > 0 && expiresAt < now
  const used = invite?.status && invite.status !== 'pending'
  const emailMatches =
    normalizeEmail(invite?.email) !== '' &&
    normalizeEmail(invite?.email) === normalizeEmail(user?.email)
  const teamName = getTeamName(invite as InviteRow | null)

  const errorCode = searchParams?.error

  if (invalid) {
    return renderMessage({
      title: 'Invite not found',
      body: 'This invite link is invalid or has been revoked. Ask the team admin to resend it.',
      ctaHref: '/login',
      ctaLabel: 'Back to login',
    })
  }

  if (expired) {
    return renderMessage({
      title: 'Invite expired',
      body: 'This invite has expired. Ask your admin to generate a new link.',
      ctaHref: '/login',
      ctaLabel: 'Back to login',
    })
  }

  if (used) {
    return renderMessage({
      title: 'Invite already used',
      body: 'This invite was already accepted. Try signing in with the invited email address.',
      ctaHref: '/login',
      ctaLabel: 'Go to login',
    })
  }

  if (!user) {
    return renderMessage({
      title: 'Sign in to accept',
      body: `You need to sign in with the invited email (${invite.email || 'unknown'}) to join ${
        teamName || 'this team'
      }.`,
      ctaHref: `/login?redirectTo=/invite/${params.token}`,
      secondaryHref: `/signup?redirectTo=/invite/${params.token}`,
      ctaLabel: 'Sign in',
      secondaryLabel: 'Create account',
    })
  }

  if (!emailMatches) {
    return renderMessage({
      title: 'Email mismatch',
      body: `You are signed in as ${user.email}. This invite is for ${
        invite.email
      }. Sign out and sign in with the invited email.`,
      ctaHref: '/login?error=email_mismatch',
      ctaLabel: 'Switch account',
    })
  }

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6 rounded-3xl border border-slate-900/60 bg-surface-raised/80 p-8 shadow-inner shadow-black/20">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Team invite</p>
        <h1 className="text-2xl font-semibold text-slate-50">
          Join {teamName || 'this team'}
        </h1>
        <p className="text-sm text-slate-400">
          Accept as <span className="font-semibold text-slate-200">{invite.role}</span> using{' '}
          <span className="font-semibold text-slate-200">{invite.email}</span>.
        </p>
        {errorCode && (
          <p className="text-xs text-amber-400">
            {renderErrorMessage(errorCode) || 'Unable to accept this invite.'}
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-black/30 p-4 text-sm text-slate-200">
        <p>
          You are signed in as <span className="font-semibold">{user.email}</span>. Accepting will
          add you to this team and set your active tenant.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>We will create or update your membership for this team.</li>
          <li>We mark the invite as consumed to keep the audit trail clean.</li>
          <li>You can manage team access from Settings &gt; Roster &amp; Staff.</li>
        </ul>
      </div>

      <form action={acceptInvite} className="space-y-3">
        <input type="hidden" name="token" value={params.token} />
        <button
          type="submit"
          className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-black"
        >
          Accept invite
        </button>
        <p className="text-xs text-slate-500 text-center">
          Not you? <Link className="text-brand font-semibold" href="/login">Switch accounts</Link>
        </p>
      </form>
    </section>
  )
}

function renderMessage({
  title,
  body,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string
  body: string
  ctaHref: string
  ctaLabel: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-6 rounded-3xl border border-slate-900/60 bg-surface-raised/80 p-8 shadow-inner shadow-black/20">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Team invite</p>
        <h1 className="text-2xl font-semibold text-slate-50">{title}</h1>
        <p className="text-sm text-slate-400">{body}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={ctaHref}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-black"
        >
          {ctaLabel}
        </Link>
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </section>
  )
}

function renderErrorMessage(code?: string) {
  if (!code) return null
  const map: Record<string, string> = {
    expired: 'This invite has expired.',
    used: 'This invite was already used.',
    email_mismatch: 'You must sign in with the email that received this invite.',
    invalid: 'This invite is invalid.',
    membership_failed: 'We could not add you to the team. Try again or contact an admin.',
    invite_update_failed: 'We accepted your membership but failed to close the invite.',
  }
  return map[code] ?? null
}

function getTeamName(invite: InviteRow | null) {
  if (!invite || !invite.teams) return null
  if (Array.isArray(invite.teams)) {
    return invite.teams[0]?.name ?? null
  }
  return invite.teams.name ?? null
}
