// app/onboarding/team/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { createInitialTeam } from './actions'

type SearchParams = {
  [key: string]: string | string[] | undefined
}

export default async function TeamOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=unauthorized')
  }

  // If they already have a team, don't let them re-run onboarding
  const { data: memberships } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (memberships && memberships.length > 0) {
    redirect('/dashboard')
  }

  const errorParam = params?.error
  const error =
    typeof errorParam === 'string' && errorParam.length > 0
      ? errorParam
      : undefined

  const errorMessages: Record<string, string> = {
    invalid:
      "We couldn't create your team. Check your details and try again, or contact support if the issue persists.",
    team: "We couldn't create your team. Check your details and try again, or contact support if the issue persists.",
    member:
      "We created the team but could not add you as a member. Contact support so we can fix access.",
    user:
      "We set up your team but could not link it to your profile. Contact support so we can fix access.",
  }

  const errorMessage = error ? errorMessages[error] ?? null : null

  const getValue = (key: string) => {
    const value = params?.[key]
    if (Array.isArray(value)) {
      return value[0] ?? ''
    }
    return typeof value === 'string' ? value : ''
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center text-foreground">
      <div className="w-full max-w-3xl space-y-6 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
              Step 1 of 2
            </p>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold">
                Set up your primary team
              </h1>
              <p className="text-sm text-slate-400">
                Drop in your program details so scouting imports, AI reports,
                and gameday dashboards are tied to the right team. You can add
                more teams later.
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto rounded-xl border border-slate-800/80 bg-black/30 px-4 py-3 text-xs text-slate-300">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
              Onboarding map
            </p>
            <div className="mt-2 space-y-1">
              <p className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-brand" />
                <span>Step 1: Primary team details (now)</span>
              </p>
              <p className="flex items-start gap-2 text-slate-400">
                <span className="mt-0.5 h-2 w-2 rounded-full border border-slate-600" />
                <span>Step 2: Add roster and staff (next)</span>
              </p>
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[0.7rem] text-red-200">
            {errorMessage}
          </div>
        )}

        <form
          action={createInitialTeam}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
        >
          <input type="hidden" name="redirectTo" value="/dashboard" />

          <div className="md:col-span-2">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-slate-500">
              Team identity
            </p>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label
              htmlFor="name"
              className="block text-slate-300 font-medium"
            >
              Program / Team Name<span className="text-brand ml-0.5">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="River Town High Varsity"
              defaultValue={getValue('name')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
            <p className="text-[0.65rem] text-slate-500">
              This shows up on reports, dashboards, and scout exports.
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="level"
              className="block text-slate-300 font-medium"
            >
              Level
            </label>
            <input
              id="level"
              name="level"
              placeholder="Varsity, JV, Freshman"
              defaultValue={getValue('level')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-slate-500">
              School or organization
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="school_name"
              className="block text-slate-300 font-medium"
            >
              School / Organization
            </label>
            <input
              id="school_name"
              name="school_name"
              placeholder="River Town High School"
              defaultValue={getValue('school_name')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-slate-500">
              Address details
            </p>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label
              htmlFor="school_address_line1"
              className="block text-slate-300 font-medium"
            >
              Address
            </label>
            <input
              id="school_address_line1"
              name="school_address_line1"
              placeholder="123 Main St"
              defaultValue={getValue('school_address_line1')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="school_city"
              className="block text-slate-300 font-medium"
            >
              City
            </label>
            <input
              id="school_city"
              name="school_city"
              placeholder="Dallas"
              defaultValue={getValue('school_city')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="school_state"
              className="block text-slate-300 font-medium"
            >
              State
            </label>
            <input
              id="school_state"
              name="school_state"
              placeholder="TX"
              defaultValue={getValue('school_state')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="school_zip"
              className="block text-slate-300 font-medium"
            >
              ZIP
            </label>
            <input
              id="school_zip"
              name="school_zip"
              placeholder="75201"
              defaultValue={getValue('school_zip')}
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="md:col-span-2 flex flex-col items-end gap-2 pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand text-black text-xs font-semibold tracking-[0.16em] uppercase px-6 py-2 hover:bg-brand-soft transition-colors"
            >
              Save team and continue
            </button>
            <p className="text-[0.7rem] text-slate-400">
              Next you&apos;ll add roster and staff so we can build your reports
              correctly.
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}
