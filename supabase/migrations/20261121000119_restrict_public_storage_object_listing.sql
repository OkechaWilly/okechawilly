-- Public buckets already serve object downloads without a storage.objects
-- SELECT policy. Remove broad anonymous SELECT so visitors cannot enumerate
-- draft/unpublished object paths. Keep authenticated administrator reads for
-- Studio maintenance; upload and delete remain separately admin-only.
drop policy if exists "Public view artwork files" on storage.objects;

drop policy if exists "Admin view artwork files" on storage.objects;
create policy "Admin view artwork files"
on storage.objects
for select
to authenticated
using (
  bucket_id = any (array['artwork-images','product-images']::text[])
  and (select public.is_admin())
);