// app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already signed in, go straight to the app
  if (user) {
    redirect("/dashboard");
  }

  // Otherwise, show a simple BlitzIQ-branded landing / entry screen
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-xl space-y-8 bg-surface-raised border border-slate-800 rounded-2xl p-8 shadow-brand-card">
        <header className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
            BlitzIQ Pro
          </p>
          <h1 className="text-2xl md:text-3xl font-bold">
            Engineered to Destroy Egos.
          </h1>
          <p className="text-xs text-slate-400">
            NFL-level, in-game analytics for high school and college coaches.
            Log in to access your teams, games, and scouting reports.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs text-slate-500">
            <p className="font-semibold text-slate-300">
              Already have access?
            </p>
            <p>Use your email and password to sign in.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-black hover:bg-brand-soft transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-slate-200 hover:bg-black/40 transition-colors"
            >
              Request Access
            </Link>
          </div>
        </div>

        <p className="text-[0.7rem] text-slate-500">
          Early access coaches get priority onboarding and tighter scouting
          windows. Public launch comes later.
        </p>
      </div>
    </main>
  );
}