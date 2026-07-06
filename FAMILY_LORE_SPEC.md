# Family Lore Archive — Project Spec

A private, voice-first family memory archive for the Bruning family (2 adults, 2 kids).
Core principle: **capture must be effortless; context matters more than metadata.**

## Users
- Jon & Yvonne (admins, full capture + browse)
- Violet (5) and Flo (3) — future kid-facing capture mode, not in MVP
- Grandparents — future interview mode, not in MVP

## MVP Scope (build this, nothing else)
1. **Auth**: Supabase email auth, invite-only (no public signup). Two accounts to start.
2. **Capture**: Landing screen is a dashboard with one giant press-and-talk button
   (MediaRecorder API). Recording uploads to Supabase Storage.
3. **Enrichment pipeline** (Netlify serverless function):
   - Audio → OpenAI Whisper API → raw transcript
   - Transcript → Claude Haiku (claude-haiku-4-5) → JSON with:
     - `summary`: 1–2 sentence first-person highlight
     - `tags`: array (people, places, themes) — lowercase, kebab-case
     - `people`: array of detected family member names
   - Prompt Haiku to return ONLY raw JSON, no markdown fences; parse defensively.
4. **Photo attach**: optional photo upload on a memory (Supabase Storage).
5. **Timeline view**: reverse-chron list of memories — summary, tags, photo thumbnail,
   expandable raw transcript, audio playback.
6. **Correction UI**: edit summary, add/remove tags inline. Bad auto-tags rot the
   archive; fixing them must be one tap.

## Explicitly OUT of MVP (do not build yet)
- Vector/semantic search (pgvector) — plain tag filter + text search is enough
- Trivia/game night mode
- Story generation (will pipe into Jon's existing bedtime story app later)
- Kid capture mode, interview mode, weekly prompt notifications
- Native app / App Store anything

## Stack
- **Frontend**: Vite + React + Tailwind, configured as a PWA
  (manifest + service worker, "Add to Home Screen" on iOS/Android)
- **Backend**: Supabase — Postgres, Auth, Storage buckets (`audio/`, `photos/`)
- **Serverless**: Netlify Functions for the enrichment pipeline
  (keeps API keys server-side; never expose keys in the client)
- **Deploy**: Netlify, connected to GitHub repo
- **AI**:
  - Transcription: OpenAI Whisper API (`whisper-1`)
  - Enrichment: Anthropic API, `claude-haiku-4-5`
  - (Later) Stories: `claude-sonnet-4-6`

## Environment variables (Netlify)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (functions only)

## Data model (Postgres)
```sql
memories (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  occurred_at date,              -- when the memory happened (editable, defaults to today)
  audio_path text,               -- storage path
  photo_path text,
  transcript text,
  summary text,
  tags text[],
  people text[],
  status text default 'processing'  -- processing | ready | failed
)
```
Enable Row Level Security: any authenticated family member can read all;
only creator can delete. Everyone can edit summary/tags (family trust model).

## Enrichment prompt sketch (Haiku)
System: "You convert a family voice-note transcript into archive metadata.
Respond with ONLY valid JSON: {summary, tags, people}. Summary is 1–2 warm,
specific sentences in first person plural where natural. Tags are 3–7 lowercase
kebab-case strings covering people, places, activities, and themes. People is
the subset of these known family members mentioned: Jon, Yvonne, Violet, Flo."

## Design notes
- Mobile-first. The capture button should be usable one-handed while a kid talks.
- "Simple when lazy, customizable when needed": capture requires zero decisions;
  occurred_at, photo, and tag edits are all optional and post-hoc.
- Timeline is the reward view, not the landing view.

## Non-negotiable for later phases
- **Export**: one-button dump of all memories to markdown + media files.
  This data must outlive the app. Design the schema so export is trivial.

## Working agreements for Claude Code
- Small commits, run the dev server after each change so Jon can test immediately.
- No new dependencies without stating why.
- When the enrichment function is built, create a test script that runs it
  against a sample transcript locally before wiring up the UI.
