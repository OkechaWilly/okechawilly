-- Allow anonymous clients to create time-limited signed URLs only for published living-space photos.
-- The bucket remains public until the coordinated production rollout switches it to private.
drop policy if exists "Public read published living space images" on storage.objects;
create policy "Public read published living space images"
on storage.objects
for select
to anon
using (
  bucket_id = 'living-space-images'
  and exists (
    select 1
    from public.living_space_photos as photo
    where photo.storage_path = name
      and photo.is_published = true
  )
);
