// Pulls the entire Family Lore archive out of Supabase and onto local disk:
// every memory row, every audio recording, every photo. Safe to re-run — files
// already downloaded are skipped, so repeat runs are fast and cheap.
//
//   npm run backup                          -> ./backups
//   npm run backup -- ~/Google\ Drive/lore   -> anywhere you like
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (already in .env.local).
// The service role key bypasses RLS, which is the point: it sees every family
// member's memories, not just yours.
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Run this via `npm run backup`, which loads them from .env.local.',
  )
  process.exit(1)
}

const destRoot = resolve(process.argv[2] ?? 'backups')
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const stamp = new Date().toISOString().replace(/[:.]/g, '-')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function writeTo(path, contents) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents)
}

// --- 1. The memory rows -----------------------------------------------------

async function fetchAllMemories() {
  const pageSize = 1000
  const all = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Failed to read memories: ${error.message}`)

    all.push(...data)
    if (data.length < pageSize) return all
  }
}

// --- 2. The files ------------------------------------------------------------

// Storage paths are `<userId>/<uuid>.<ext>`, but this walks any depth so it
// keeps working if the layout ever changes.
async function listBucket(bucket, prefix = '') {
  const found = []
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset })
    if (error) throw new Error(`Failed to list ${bucket}/${prefix}: ${error.message}`)

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      // Supabase marks folders with a null id.
      if (entry.id === null) found.push(...(await listBucket(bucket, path)))
      else found.push(path)
    }

    if (data.length < pageSize) return found
  }
}

async function downloadMissing(bucket, paths) {
  let downloaded = 0
  let skipped = 0

  for (const path of paths) {
    const target = join(destRoot, bucket, path)

    if (await exists(target)) {
      skipped++
      continue
    }

    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error) {
      console.error(`  ! could not download ${bucket}/${path}: ${error.message}`)
      continue
    }

    await writeTo(target, Buffer.from(await data.arrayBuffer()))
    downloaded++
    console.log(`  + ${bucket}/${path}`)
  }

  return { downloaded, skipped }
}

// --- 3. A human-readable copy ------------------------------------------------

// The JSON is for restoring; this is so the archive is still readable in twenty
// years by someone who has never heard of Supabase.
function renderArchive(memories) {
  const lines = [
    '# Family Lore archive',
    '',
    `${memories.length} ${memories.length === 1 ? 'memory' : 'memories'}, backed up ${new Date().toDateString()}.`,
    '',
    'Audio and photo files are in the `audio/` and `photos/` folders next to this file.',
    '',
  ]

  for (const m of memories) {
    lines.push(`## ${m.occurred_at ?? 'Undated'}`)
    lines.push('')
    if (m.summary) lines.push(m.summary, '')
    if (m.people?.length) lines.push(`**People:** ${m.people.join(', ')}`)
    if (m.tags?.length) lines.push(`**Tags:** ${m.tags.join(', ')}`)
    if (m.audio_path) lines.push(`**Recording:** [audio/${m.audio_path}](audio/${m.audio_path})`)
    for (const [i, photo] of (m.photo_paths ?? []).entries()) {
      const label = (m.photo_paths ?? []).length > 1 ? `Photo ${i + 1}` : 'Photo'
      lines.push(`**${label}:** [photos/${photo}](photos/${photo})`)
    }
    if (m.status !== 'ready') lines.push(`**Status:** ${m.status}`)
    lines.push('')
    if (m.transcript) lines.push('> ' + m.transcript.replace(/\n+/g, '\n> '), '')
    lines.push('---', '')
  }

  return lines.join('\n')
}

// --- Run ---------------------------------------------------------------------

console.log(`Backing up to ${destRoot}\n`)

const memories = await fetchAllMemories()
console.log(`Memories: ${memories.length}`)

await writeTo(join(destRoot, 'memories', `memories-${stamp}.json`), JSON.stringify(memories, null, 2))
await writeTo(join(destRoot, 'memories', 'latest.json'), JSON.stringify(memories, null, 2))
await writeTo(join(destRoot, 'ARCHIVE.md'), renderArchive(memories))

console.log('\nFiles:')
const results = {}
for (const bucket of ['audio', 'photos']) {
  const paths = await listBucket(bucket)
  results[bucket] = await downloadMissing(bucket, paths)
  const { downloaded, skipped } = results[bucket]
  console.log(`  ${bucket}: ${downloaded} new, ${skipped} already saved (${paths.length} total)`)
}

// Integrity check: a row pointing at a file that isn't in storage means the
// recording is already gone, and no backup can bring it back. Worth knowing.
const storedAudio = new Set(await listBucket('audio'))
const storedPhotos = new Set(await listBucket('photos'))
const orphanRows = memories.filter(
  (m) =>
    (m.audio_path && !storedAudio.has(m.audio_path)) ||
    (m.photo_paths ?? []).some((p) => !storedPhotos.has(p)),
)

if (orphanRows.length) {
  console.log(`\n! ${orphanRows.length} memory row(s) reference files missing from storage:`)
  for (const m of orphanRows) console.log(`    ${m.id} (${m.occurred_at})`)
}

const totalNew = results.audio.downloaded + results.photos.downloaded
console.log(`\nDone. ${totalNew} new file(s) saved. Snapshot: memories/memories-${stamp}.json`)
