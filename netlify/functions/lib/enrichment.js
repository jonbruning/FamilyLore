const ENRICHMENT_SYSTEM_PROMPT = `You convert a family voice-note transcript into archive metadata.
Respond with ONLY valid JSON: {summary, tags, people}. Summary is 1–2 warm,
specific sentences in first person plural where natural. Tags are 3–7 lowercase
kebab-case strings covering people, places, activities, and themes. People is
the subset of these known family members mentioned: Jon, Yvonne, Violet, Flo.
Respond with raw JSON only — no markdown code fences, no commentary.`

export async function transcribeAudio(audioBlob, filename) {
  const form = new FormData()
  form.append('file', audioBlob, filename)
  form.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  })

  if (!res.ok) {
    throw new Error(`Whisper transcription failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  return data.text
}

export async function enrichTranscript(transcript) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: ENRICHMENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
  })

  if (!res.ok) {
    throw new Error(`Haiku enrichment failed (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  return data.content[0].text
}

function stripCodeFences(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced ? fenced[1] : trimmed
}

export function parseEnrichmentJson(rawText) {
  const cleaned = stripCodeFences(rawText)

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(`Haiku did not return valid JSON (${err.message}). Raw response: ${rawText}`)
  }

  if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.tags) || !Array.isArray(parsed.people)) {
    throw new Error(`Haiku JSON missing expected summary/tags/people fields: ${JSON.stringify(parsed)}`)
  }

  return { summary: parsed.summary, tags: parsed.tags, people: parsed.people }
}
