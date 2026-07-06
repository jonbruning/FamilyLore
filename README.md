# Family Lore

A private, voice-first family memory archive. See `FAMILY_LORE_SPEC.md` for the full project spec.

## Local setup

1. Create a Supabase project (or use the shared one for this project).
2. In the Supabase dashboard, go to **Authentication → Providers → Email** and disable
   "Allow new users to sign up" (invite-only auth).
3. Under **Authentication → Users**, manually add the two family accounts.
4. In the **SQL Editor**, run the migrations in `supabase/migrations/` in order
   (`0001_memories.sql`, `0002_storage.sql`) — they create the `memories` table
   and the `audio`/`photos` Storage buckets, with RLS policies.
5. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API).
6. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

## Deploy

Connected to Netlify via `netlify.toml` (build: `npm run build`, publish: `dist`).
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Netlify environment variables.
