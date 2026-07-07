import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { CaptureButton } from './CaptureButton'
import { TimelineView } from './TimelineView'

type View = 'capture' | 'timeline'

export function Dashboard({ session }: { session: Session }) {
  const [view, setView] = useState<View>('capture')

  return (
    <div className="flex min-h-svh flex-col bg-white dark:bg-neutral-900">
      <div className="flex shrink-0 items-center justify-between px-4 pt-4 text-sm">
        <button
          type="button"
          onClick={() => setView(view === 'capture' ? 'timeline' : 'capture')}
          className="text-violet-600 hover:underline dark:text-violet-400"
        >
          {view === 'capture' ? 'View timeline' : '← Record'}
        </button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Sign out
        </button>
      </div>

      {view === 'capture' ? <CaptureButton userId={session.user.id} /> : <TimelineView />}
    </div>
  )
}
