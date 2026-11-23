-- Keep published living-space photographs in the existing public bucket.
-- New unpublished photographs live in a private bucket until they are published.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'living-space-drafts',
  'living-space-drafts',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.living_space_photos
  add column if not exists storage_bucket text not null default 'living-space-images';

alter table public.living_space_photos
  drop constraint if exists living_space_photos_storage_bucket_check;

alter table public.living_space_photos
  add constraint living_space_photos_storage_bucket_check
  check (storage_bucket in ('living-space-images', 'living-space-drafts'));

create policy "Admin read private living space drafts"
on storage.objects for select to authenticated
using (bucket_id = 'living-space-drafts' and (select public.is_admin()));

create policy "Admin upload private living space drafts"
on storage.objects for insert to authenticated
with check (bucket_id = 'living-space-drafts' and (select public.is_admin()));

create policy "Admin update private living space drafts"
on storage.objects for update to authenticated
using (bucket_id = 'living-space-drafts' and (select public.is_admin()))
with check (bucket_id = 'living-space-drafts' and (select public.is_admin()));

create policy "Admin delete private living space drafts"
on storage.objects for delete to authenticated
using (bucket_id = 'living-space-drafts' and (select public.is_admin()));
