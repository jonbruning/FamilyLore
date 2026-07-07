import { useEffect, useState } from 'react'
import type { Memory } from '../lib/memories'
import { fetchMemories, subscribeToMemories } from '../lib/memories'
import { TimelineCard } from './TimelineCard'

export function TimelineView() {
  const [memories, setMemories] = useState<Memory[] | null>(null)

  useEffect(() => {
    fetchMemories().then(setMemories).catch(console.error)
    return subscribeToMemories(() => {
      fetchMemories().then(setMemories).catch(console.error)
    })
  }, [])

  if (memories === null) {
    return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Loading…</p>
  }

  if (memories.length === 0) {
    return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">No memories yet.</p>
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 p-4">
      {memories.map((memory) => (
        <TimelineCard key={memory.id} memory={memory} />
      ))}
    </div>
  )
}
