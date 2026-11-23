-- Public, admin-managed photographs of Okecha Willy artworks displayed in collectors' spaces.
create table if not exists public.living_space_photos (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  caption text,
  location text,
  storage_path text not null unique,
  alt_text text not null check (length(trim(alt_text)) between 1 and 250),
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists living_space_photos_public_order_idx
  on public.living_space_photos (is_published, sort_order, created_at desc);

drop trigger if exists set_updated_at on public.living_space_photos;
create trigger set_updated_at
  before update on public.living_space_photos
  for each row execute function public.set_updated_at();

alter table public.living_space_photos enable row level security;

drop policy if exists "Public read published living space photos" on public.living_space_photos;
create policy "Public read published living space photos"
  on public.living_space_photos
  for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "Admin manage living space photos" on public.living_space_photos;
create policy "Admin manage living space photos"
  on public.living_space_photos
  for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.living_space_photos to anon, authenticated;
grant insert, update, delete on public.living_space_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'living-space-images',
  'living-space-images',
  true,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admin list living space images" on storage.objects;
create policy "Admin list living space images"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'living-space-images' and (select public.is_admin()));

drop policy if exists "Admin upload living space images" on storage.objects;
create policy "Admin upload living space images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'living-space-images' and (select public.is_admin()));

drop policy if exists "Admin update living space images" on storage.objects;
create policy "Admin update living space images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'living-space-images' and (select public.is_admin()))
  with check (bucket_id = 'living-space-images' and (select public.is_admin()));

drop policy if exists "Admin delete living space images" on storage.objects;
create policy "Admin delete living space images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'living-space-images' and (select public.is_admin()));
