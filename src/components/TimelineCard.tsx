import { useEffect, useRef, useState } from 'react'
import type { Memory } from '../lib/memories'
import { attachPhoto, deleteMemory, getSignedUrl, removePhoto, updateMemory } from '../lib/memories'

export function TimelineCard({ memory, onTagClick }: { memory: Memory; onTagClick: (tag: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [summary, setSummary] = useState(memory.summary ?? '')
  const [tags, setTags] = useState(memory.tags ?? [])
  const [newTag, setNewTag] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Joined into a string so the effect keys off the contents, not the array
  // identity — realtime hands us a fresh array on every refetch.
  const photoKey = memory.photo_paths.join(',')

  useEffect(() => {
    const paths = photoKey ? photoKey.split(',') : []
    let cancelled = false

    Promise.all(paths.map(async (path) => ({ path, url: await getSignedUrl('photos', path) })))
      .then((loaded) => !cancelled && setPhotos(loaded))
      .catch(console.error)

    return () => {
      cancelled = true
    }
  }, [photoKey])

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
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    try {
      // Sequential so each upload appends to the list the previous one wrote.
      for (const file of files) {
        const path = await attachPhoto(memory, file)
        setPhotos((current) => [...current, { path, url: '' }])
        const url = await getSignedUrl('photos', path)
        setPhotos((current) => current.map((p) => (p.path === path ? { path, url } : p)))
      }
    } catch (err) {
      console.error('Failed to attach photo:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleRemovePhoto(path: string) {
    if (!confirm('Remove this photo? This cannot be undone.')) return
    setPhotos((current) => current.filter((p) => p.path !== path))
    try {
      await removePhoto(memory, path)
    } catch (err) {
      console.error('Failed to remove photo:', err)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this memory? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteMemory(memory)
    } catch (err) {
      console.error('Failed to delete memory:', err)
      setDeleting(false)
    }
  }

  return (
    <div
      className={`rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 ${deleting ? 'opacity-50' : ''}`}
    >
      <div className="mb-2 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{memory.occurred_at}</span>
        <div className="flex items-center gap-3">
          {memory.status !== 'ready' && (
            <span className={memory.status === 'failed' ? 'text-red-600 dark:text-red-400' : ''}>
              {memory.status}
            </span>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-neutral-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      {photos.length > 0 && (
        <div className={`mb-3 grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {photos.map(({ path, url }) => (
            <div key={path} className="relative">
              {url && (
                <img
                  src={url}
                  alt=""
                  className={`w-full rounded-md object-contain ${photos.length > 1 ? 'max-h-64' : 'max-h-[28rem]'}`}
                />
              )}
              <button
                type="button"
                onClick={() => handleRemovePhoto(path)}
                aria-label="Remove photo"
                className="absolute top-1.5 right-1.5 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white hover:bg-black/75"
              >
                ×
              </button>
            </div>
          ))}
        </div>
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
            <button type="button" onClick={() => onTagClick(tag)} className="hover:underline">
              {tag}
            </button>
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
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-neutral-500 hover:underline disabled:opacity-50 dark:text-neutral-400"
        >
          {uploading ? 'Adding…' : photos.length ? '+ Add photo' : '+ Photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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
