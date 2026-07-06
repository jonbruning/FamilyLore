create extension if not exists pgcrypto;

create table memories (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users not null default auth.uid(),
  created_at timestamptz default now(),
  occurred_at date default current_date,
  audio_path text,
  photo_path text,
  transcript text,
  summary text,
  tags text[],
  people text[],
  status text default 'processing'
);

alter table memories enable row level security;

-- Any authenticated family member can read all memories.
create policy "memories_select_authenticated"
  on memories for select
  to authenticated
  using (true);

-- Any authenticated family member can create a memory (attributed to themselves).
create policy "memories_insert_own"
  on memories for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Family trust model: any authenticated member can edit (app UI limits this to
-- summary/tags, per FAMILY_LORE_SPEC.md's correction UI).
create policy "memories_update_authenticated"
  on memories for update
  to authenticated
  using (true)
  with check (true);

-- Only the creator can delete their own memory.
create policy "memories_delete_own"
  on memories for delete
  to authenticated
  using (auth.uid() = created_by);
