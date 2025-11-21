// app/test/page.tsx
import { createSupabaseServerClient } from '@/utils/supabase/server'

export default async function TestPage() {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .limit(20)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 space-y-4">
      <h1 className="text-2xl font-bold">Supabase SSR Test - Formations</h1>

      {error && (
        <p className="text-red-500">
          Error: {error.message}
        </p>
      )}

      {!error && (!data || data.length === 0) && (
        <p>No formations found. (This is still a successful connection.)</p>
      )}

      {!error && data && data.length > 0 && (
        <div className="w-full max-w-xl border rounded-lg p-4 bg-white shadow-sm">
          <h2 className="font-semibold mb-2">First {data.length} rows from `formations`</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </main>
  )
}
