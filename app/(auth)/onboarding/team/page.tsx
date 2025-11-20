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

  let errorMessage: string | null = null

  if (error === 'invalid') {
    errorMessage = 'Please check the fields and try again.'
  } else if (error === 'team') {
    errorMessage = "We couldn't create your team. Try again."
  } else if (error === 'member') {
    errorMessage =
      'Team was created but we could not complete membership. Contact support.'
  } else if (error === 'user') {
    errorMessage =
      'We set up your team but could not link it to your profile. Contact support.'
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center text-foreground">
      <div className="w-full max-w-2xl space-y-6 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <header className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
            Step 1 of 2
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">
            Set up your primary team
          </h1>
          <p className="text-xs text-slate-400">
            This powers your scouting imports, AI reports, and gameday
            dashboards. You can add more teams later.
          </p>
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
              placeholder="American Christian Academy Varsity"
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
              placeholder="Varsity, JV, 8U, etc."
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
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
              placeholder="American Christian Academy"
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
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
              placeholder="7115 1st Ave"
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
              placeholder="Tuscaloosa"
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
              placeholder="AL"
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
              placeholder="35405"
              className="w-full rounded-lg bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand text-black text-xs font-semibold tracking-[0.16em] uppercase px-6 py-2 hover:bg-brand-soft transition-colors"
            >
              Save team &amp; continue
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
