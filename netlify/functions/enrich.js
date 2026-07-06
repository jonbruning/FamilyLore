import { createClient } from '@supabase/supabase-js'
import { transcribeAudio, enrichTranscript, parseEnrichmentJson } from './lib/enrichment.js'

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async (req) => {
  const { memoryId } = await req.json()
  if (!memoryId) {
    return new Response(JSON.stringify({ error: 'memoryId is required' }), { status: 400 })
  }

  try {
    const { data: memory, error: fetchError } = await supabaseAdmin
      .from('memories')
      .select('id, audio_path')
      .eq('id', memoryId)
      .single()
    if (fetchError) throw fetchError
    if (!memory.audio_path) throw new Error('Memory has no audio_path')

    const { data: audioBlob, error: downloadError } = await supabaseAdmin.storage
      .from('audio')
      .download(memory.audio_path)
    if (downloadError) throw downloadError

    const transcript = await transcribeAudio(audioBlob, memory.audio_path)
    const rawEnrichment = await enrichTranscript(transcript)
    const { summary, tags, people } = parseEnrichmentJson(rawEnrichment)

    const { error: updateError } = await supabaseAdmin
      .from('memories')
      .update({ transcript, summary, tags, people, status: 'ready' })
      .eq('id', memoryId)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ ok: true, summary, tags, people }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(`Enrichment failed for memory ${memoryId}:`, err)
    await supabaseAdmin.from('memories').update({ status: 'failed' }).eq('id', memoryId)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
