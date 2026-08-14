-- A memory can hold any number of photos, not just one. Follows the same
-- text[] shape already used for tags and people.
begin;

alter table memories add column photo_paths text[] not null default '{}';

update memories
set photo_paths = array[photo_path]
where photo_path is not null;

alter table memories drop column photo_path;

commit;
