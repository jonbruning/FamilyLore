import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function Dashboard({ session }: { session: Session }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-white px-4 dark:bg-neutral-900">
      <p className="text-neutral-600 dark:text-neutral-400">
        Signed in as {session.user.email}
      </p>
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        Sign out
      </button>
    </div>
  )
}
