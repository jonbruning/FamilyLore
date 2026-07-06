// Sanity-checks the Claude Haiku enrichment step against a sample transcript,
// independent of audio/Whisper/Supabase. Run with:
//   node --env-file=.env.local scripts/test-enrichment.mjs
import { enrichTranscript, parseEnrichmentJson } from '../netlify/functions/lib/enrichment.js'

const sampleTranscript = `
Okay so today Violet lost her first tooth at the park and she was so proud
she wanted to call grandma right away. Flo tried to convince her the tooth
fairy pays more for teeth with more wiggles. We got ice cream after to
celebrate.
`.trim()

const raw = await enrichTranscript(sampleTranscript)
console.log('Raw Haiku response:\n', raw, '\n')

const parsed = parseEnrichmentJson(raw)
console.log('Parsed enrichment:\n', JSON.stringify(parsed, null, 2))
