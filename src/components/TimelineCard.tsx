import { useEffect, useRef, useState } from 'react'
import type { Memory } from '../lib/memories'
import { attachPhoto, getSignedUrl, updateMemory } from '../lib/memories'

export function TimelineCard({ memory }: { memory: Memory }) {
  const [expanded, setExpanded] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const [summary, setSummary] = useState(memory.summary ?? '')
  const [tags, setTags] = useState(memory.tags ?? [])
  const [newTag, setNewTag] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (memory.photo_path) getSignedUrl('photos', memory.photo_path).then(setPhotoUrl).catch(console.error)
  }, [memory.photo_path])

  async function toggleAudio() {
    if (audioUrl || !memory.audio_path) return
    setAudioUrl(await getSignedUrl('audio', memory.audio_path))
  }

  async function saveSummary() {
    if (summary === memory.summary) return
    await updateMemory(memory.id, { summary })
  }

  async function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    await updateMemory(memory.id, { tags: next })
  }

  async function addTag() {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || tags.includes(tag)) {
      setNewTag('')
      return
    }
    const next = [...tags, tag]
    setTags(next)
    setNewTag('')
    await updateMemory(memory.id, { tags: next })
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = await attachPhoto(memory, file)
    setPhotoUrl(await getSignedUrl('photos', path))
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{memory.occurred_at}</span>
        {memory.status !== 'ready' && (
          <span className={memory.status === 'failed' ? 'text-red-600 dark:text-red-400' : ''}>
            {memory.status}
          </span>
        )}
      </div>

      {photoUrl && (
        <img src={photoUrl} alt="" className="mb-3 max-h-48 w-full rounded-md object-cover" />
      )}

      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onBlur={saveSummary}
        rows={2}
        className="w-full resize-none rounded-md border-none bg-transparent p-0 text-neutral-900 focus:outline-none dark:text-neutral-50"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-violet-500 hover:text-violet-900">
              ×
            </button>
          </span>
        ))}
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTag()}
          onBlur={addTag}
          placeholder="+ tag"
          className="w-16 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-xs focus:outline-none dark:border-neutral-700"
        />
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        {memory.audio_path && (
          <button type="button" onClick={toggleAudio} className="text-violet-600 hover:underline dark:text-violet-400">
            {audioUrl ? '' : '▶ Play'}
          </button>
        )}
        {audioUrl && <audio src={audioUrl} controls className="h-8" />}
        {memory.transcript && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-neutral-500 hover:underline dark:text-neutral-400"
          >
            {expanded ? 'Hide transcript' : 'Show transcript'}
          </button>
        )}
        {!memory.photo_path && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-neutral-500 hover:underline dark:text-neutral-400"
          >
            + Photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelected}
          className="hidden"
        />
      </div>

      {expanded && memory.transcript && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{memory.transcript}</p>
      )}
    </div>
  )
}
