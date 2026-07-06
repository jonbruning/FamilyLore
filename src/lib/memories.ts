import { supabase } from './supabase'

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
