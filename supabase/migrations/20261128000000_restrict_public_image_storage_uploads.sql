-- Restrict public image buckets to raster formats used by the Studio.
-- The browser prepares large photos before upload; Storage enforces the final
-- 20 MiB limit and MIME allowlist even if a client bypasses the UI.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
where id in ('artwork-images','product-images');
