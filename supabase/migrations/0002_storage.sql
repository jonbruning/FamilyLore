insert into storage.buckets (id, name, public)
values ('audio', 'audio', false), ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "audio_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'audio');

create policy "audio_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audio');

create policy "audio_delete_owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'audio' and owner = auth.uid());

create policy "photos_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos');

create policy "photos_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos');

create policy "photos_delete_owner"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());
