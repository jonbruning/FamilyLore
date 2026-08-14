# Family Lore

A private, voice-first family memory archive. See `FAMILY_LORE_SPEC.md` for the full project spec.

## Local setup

1. Create a Supabase project (or use the shared one for this project).
2. In the Supabase dashboard, go to **Authentication → Providers → Email** and disable
   "Allow new users to sign up" (invite-only auth).
3. Under **Authentication → Users**, manually add the two family accounts.
4. In the **SQL Editor**, run every migration in `supabase/migrations/` in order
   (`0001_memories.sql` … `0004_multiple_photos.sql`) — they create the `memories`
   table and the `audio`/`photos` Storage buckets with RLS policies, enable
   realtime, and move photos to a `photo_paths text[]` column.
5. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API).
6. For the enrichment pipeline (Netlify Functions), also fill in `SUPABASE_URL`
   (same project URL), `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API —
   keep secret, server-side only), `OPENAI_API_KEY`, and `ANTHROPIC_API_KEY`.
7. Install dependencies and run the dev server:

   ```bash
   npm install
   npx netlify dev      # http://localhost:8888
   ```

   Use `netlify dev`, not `npm run dev` — plain Vite doesn't serve
   `/.netlify/functions/enrich`, so recordings would upload but never
   get transcribed.

## Backups

Everything — recordings, photos, and the memory rows — lives only in Supabase,
so keep a copy elsewhere:

```bash
npm run backup                    # -> ./backups (gitignored)
npm run backup -- /some/path      # anywhere else
```

Safe to re-run: files already downloaded are skipped. It writes timestamped JSON
snapshots plus an `ARCHIVE.md` that stays readable without the app.

On Jon's Mac a launchd agent (`~/Library/LaunchAgents/com.familylore.backup.plist`)
runs this weekly into iCloud Drive; log at `~/Library/Logs/family-lore-backup.log`.

## Keeping Supabase awake

Free-tier projects pause after 7 days of inactivity and are deleted after 90 days
paused. `.github/workflows/keepalive.yml` runs a daily query to prevent that. Note
that GitHub disables scheduled workflows after 60 days with no commits to the repo.

## Deploy

Connected to Netlify via `netlify.toml` (build: `npm run build`, publish: `dist`).
Set these as Netlify environment variables: `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
