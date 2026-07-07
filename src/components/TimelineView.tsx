import { useEffect, useState } from 'react'
import type { Memory } from '../lib/memories'
import { fetchMemories, subscribeToMemories } from '../lib/memories'
import { TimelineCard } from './TimelineCard'

export function TimelineView() {
  const [memories, setMemories] = useState<Memory[] | null>(null)
  const [tagQuery, setTagQuery] = useState('')

  useEffect(() => {
    fetchMemories().then(setMemories).catch(console.error)
    return subscribeToMemories(() => {
      fetchMemories().then(setMemories).catch(console.error)
    })
  }, [])

  if (memories === null) {
    return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Loading…</p>
  }

  const normalizedQuery = tagQuery.trim().toLowerCase()
  const visibleMemories = normalizedQuery
    ? memories.filter((m) => (m.tags ?? []).some((tag) => tag.includes(normalizedQuery)))
    : memories

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 p-4">
      <input
        value={tagQuery}
        onChange={(e) => setTagQuery(e.target.value)}
        placeholder="Search tags…"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-violet-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
      />

      {memories.length === 0 && (
        <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">No memories yet.</p>
      )}

      {memories.length > 0 && visibleMemories.length === 0 && (
        <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">No memories match "{tagQuery}".</p>
      )}

      {visibleMemories.map((memory) => (
        <TimelineCard key={memory.id} memory={memory} onTagClick={setTagQuery} />
      ))}
    </div>
  )
}
