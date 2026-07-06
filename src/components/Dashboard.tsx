import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { CaptureButton } from './CaptureButton'

export function Dashboard({ session }: { session: Session }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="absolute right-4 top-4 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        Sign out
      </button>
      <CaptureButton userId={session.user.id} />
    </div>
  )
}
