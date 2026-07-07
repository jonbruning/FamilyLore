import { supabase } from './supabase'

export type Memory = {
  id: string
  created_by: string
  created_at: string
  occurred_at: string
  audio_path: string | null
  photo_path: string | null
  transcript: string | null
  summary: string | null
  tags: string[] | null
  people: string[] | null
  status: 'processing' | 'ready' | 'failed'
}

const CANDIDATE_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']

export function pickRecordingMimeType(): string {
  const supported = CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
  if (!supported) throw new Error('No supported audio recording format found in this browser.')
  return supported
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'bin'
}

export async function createMemoryFromRecording(blob: Blob, userId: string) {
  const extension = extensionForMimeType(blob.type)
  const path = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage.from('audio').upload(path, blob, {
    contentType: blob.type,
  })
  if (uploadError) throw uploadError

  const { data, error: insertError } = await supabase
    .from('memories')
    .insert({ audio_path: path, created_by: userId })
    .select()
    .single()
  if (insertError) throw insertError

  triggerEnrichment(data.id)

  return data
}

function triggerEnrichment(memoryId: string) {
  fetch('/.netlify/functions/enrich', {
    method: 'POST',
    body: JSON.stringify({ memoryId }),
  }).catch((err) => console.error('Failed to trigger enrichment:', err))
}

export async function fetchMemories(): Promise<Memory[]> {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function subscribeToMemories(onChange: () => void) {
  const channel = supabase
    .channel('memories-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function updateMemory(id: string, patch: Partial<Pick<Memory, 'summary' | 'tags'>>) {
  const { error } = await supabase.from('memories').update(patch).eq('id', id)
  if (error) throw error
}

export async function getSignedUrl(bucket: 'audio' | 'photos', path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60)
  if (error) throw error
  return data.signedUrl
}

export async function attachPhoto(memory: Memory, file: File) {
  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${memory.created_by}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage.from('photos').upload(path, file, {
    contentType: file.type,
  })
  if (uploadError) throw uploadError

  const { error: updateError } = await supabase.from('memories').update({ photo_path: path }).eq('id', memory.id)
  if (updateError) throw updateError

  return path
}
